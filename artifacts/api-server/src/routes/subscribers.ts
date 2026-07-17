import { Router, type IRouter } from "express";
import { db, subscribersTable } from "@workspace/db";
import {
  SubscribeBody,
  ListSubscribersResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { resolveProductDiscount } from "../lib/discounts";
import { sendWelcomeOfferEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Email the claimed code — but only after validating it against the discount
// table, so an arbitrary client-supplied string can never reach an email.
// Repeat signups get the email again (the popup is how people ask for a
// resend). Never blocks the signup response on email failures.
async function emailWelcomeCode(email: string, rawCode: string | null | undefined): Promise<void> {
  const code = (rawCode ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 30);
  if (!code) return;
  try {
    const resolved = await resolveProductDiscount(code);
    if (resolved) {
      await sendWelcomeOfferEmail({ email, discountCode: resolved.code, discountPercent: resolved.percent });
    }
  } catch (err) {
    logger.error({ err, email }, "Failed to send welcome offer email");
  }
}

router.post("/subscribe", async (req, res): Promise<void> => {
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, source, discountCode } = parsed.data;

  try {
    await db.insert(subscribersTable).values({
      email,
      source: source ?? "website",
      discountCode: discountCode ?? null,
    });
  } catch {
    // Duplicate email — they're already on the list. Treat it as success so
    // the welcome popup shows the code again instead of erroring on repeat
    // visitors (the per-email single-use rule is enforced at checkout).
    await emailWelcomeCode(email, discountCode);
    res.status(200).json({ message: "Already subscribed", discountCode: discountCode ?? null });
    return;
  }

  await emailWelcomeCode(email, discountCode);
  res.status(201).json({ message: "Subscribed successfully", discountCode: discountCode ?? null });
});

router.get("/admin/subscribers", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(subscribersTable)
    .orderBy(subscribersTable.createdAt);

  res.json(
    ListSubscribersResponse.parse({
      subscribers: rows.map((r) => ({
        id: r.id,
        email: r.email,
        source: r.source ?? null,
        discountCode: r.discountCode ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    }),
  );
});

export default router;
