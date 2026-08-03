import { Router, type IRouter } from "express";
import { lookupByToken, unsubscribeByToken, resubscribeByToken, getBusinessAddress } from "../lib/marketingList";
import { logger } from "../lib/logger";

// Public opt-out. No auth: the token in the email footer IS the credential,
// because requiring a login to unsubscribe is both hostile and non-compliant.

const router: IRouter = Router();

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(opts: { heading: string; body: string; action?: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>BougieBams email preferences</title>
<style>
  body{margin:0;background:#FAF7F0;color:#1E2A5A;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
  .wrap{max-width:34rem;margin:0 auto;padding:3rem 1.25rem}
  .card{background:#fff;border:1px solid #E2DBCD;border-radius:14px;padding:2rem;text-align:center}
  h1{font-size:1.35rem;margin:0 0 .75rem}
  p{color:#5A6178;margin:.5rem 0}
  button{font:inherit;font-weight:600;cursor:pointer;border-radius:9px;padding:.7rem 1.4rem;margin-top:1rem}
  .primary{background:#1E2A5A;color:#FAF7F0;border:0}
  .link{background:none;border:0;color:#8A6D1A;text-decoration:underline;padding:.4rem}
  .addr{color:#9A8F7E;font-size:.78rem;margin-top:1.75rem}
  a{color:#8A6D1A}
</style></head>
<body><div class="wrap"><div class="card">
<h1>${opts.heading}</h1>
${opts.body}
${opts.action ?? ""}
</div>
<p class="addr">BougieBams · <a href="https://bougiebams.com">bougiebams.com</a>${ADDRESS_SLOT}</p>
</div></body></html>`;
}

const ADDRESS_SLOT = "__ADDRESS__";

async function renderPage(opts: { heading: string; body: string; action?: string }): Promise<string> {
  const address = await getBusinessAddress();
  return page(opts).replace(ADDRESS_SLOT, address ? `<br/>${esc(address)}` : "");
}

// Landing page for the footer link. Deliberately does NOT unsubscribe on load:
// mail scanners and link previewers fetch URLs in the background, which would
// silently opt people out.
router.get("/unsubscribe/:token", async (req, res): Promise<void> => {
  const token = req.params.token as string;
  const found = await lookupByToken(token);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (!found) {
    res.status(404).send(
      await renderPage({
        heading: "Link not recognized",
        body: "<p>This unsubscribe link is invalid or has expired. Email <a href=\"mailto:hello@bougiebams.com\">hello@bougiebams.com</a> and we'll take care of it.</p>",
      }),
    );
    return;
  }

  if (found.unsubscribed) {
    res.send(
      await renderPage({
        heading: "You're already unsubscribed",
        body: `<p><strong>${esc(found.email)}</strong> won't receive marketing emails from us.</p>`,
        action: `<form method="POST" action="/api/resubscribe/${encodeURIComponent(token)}"><button class="link" type="submit">Actually, resubscribe me</button></form>`,
      }),
    );
    return;
  }

  res.send(
    await renderPage({
      heading: "Unsubscribe from BougieBams emails?",
      body: `<p>We'll stop sending marketing emails to <strong>${esc(found.email)}</strong>.</p><p>You'll still get receipts and confirmations for anything you buy or register for.</p>`,
      action: `<form method="POST" action="/api/unsubscribe/${encodeURIComponent(token)}"><button class="primary" type="submit">Unsubscribe</button></form>`,
    }),
  );
});

// One-click opt-out. Also the target of the List-Unsubscribe-Post header, which
// Gmail/Yahoo require from bulk senders (RFC 8058) — they POST here directly.
router.post("/unsubscribe/:token", async (req, res): Promise<void> => {
  const token = req.params.token as string;
  try {
    const email = await unsubscribeByToken(token);
    // RFC 8058 clients send no Accept header worth branching on and ignore the
    // body; a plain 200 is what they want.
    if (!req.accepts("html")) {
      res.status(email ? 200 : 404).json({ ok: !!email });
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(email ? 200 : 404).send(
      await renderPage(
        email
          ? {
              heading: "You're unsubscribed",
              body: `<p>We won't send marketing emails to <strong>${esc(email)}</strong> anymore.</p><p>Receipts and event confirmations will still arrive as usual.</p>`,
              action: `<form method="POST" action="/api/resubscribe/${encodeURIComponent(token)}"><button class="link" type="submit">Changed your mind? Resubscribe</button></form>`,
            }
          : {
              heading: "Link not recognized",
              body: "<p>We couldn't find that subscription. Email <a href=\"mailto:hello@bougiebams.com\">hello@bougiebams.com</a> and we'll sort it out.</p>",
            },
      ),
    );
  } catch (err) {
    logger.error({ err }, "Unsubscribe failed");
    res.status(500).send(
      await renderPage({
        heading: "Something went wrong",
        body: "<p>We couldn't process that just now. Email <a href=\"mailto:hello@bougiebams.com\">hello@bougiebams.com</a> and we'll remove you by hand.</p>",
      }),
    );
  }
});

router.post("/resubscribe/:token", async (req, res): Promise<void> => {
  const token = req.params.token as string;
  const email = await resubscribeByToken(token);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(email ? 200 : 404).send(
    await renderPage(
      email
        ? {
            heading: "You're back on the list",
            body: `<p><strong>${esc(email)}</strong> will receive BougieBams news and offers again.</p>`,
          }
        : {
            heading: "Link not recognized",
            body: "<p>We couldn't find that subscription.</p>",
          },
    ),
  );
});

export default router;
