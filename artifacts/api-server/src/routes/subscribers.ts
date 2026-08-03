import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subscribersTable } from "@workspace/db";
import {
  SubscribeBody,
  ListSubscribersResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { resolveProductDiscount } from "../lib/discounts";
import { sendWelcomeOfferEmail } from "../lib/email";
import { subscribeEmail, getBusinessAddress } from "../lib/marketingList";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Email the claimed code — but only after validating it against the discount
// table, so an arbitrary client-supplied string can never reach an email.
// Repeat signups get the email again (the popup is how people ask for a
// resend). Never blocks the signup response on email failures.
async function emailWelcomeCode(
  email: string,
  rawCode: string | null | undefined,
  unsubscribeToken: string,
): Promise<void> {
  const code = (rawCode ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 30);
  if (!code) return;
  try {
    const resolved = await resolveProductDiscount(code);
    if (resolved) {
      await sendWelcomeOfferEmail({
        email,
        discountCode: resolved.code,
        discountPercent: resolved.percent,
        unsubscribeToken,
        postalAddress: await getBusinessAddress(),
      });
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
    // Signing up again after opting out counts as fresh consent, so this also
    // clears a previous unsubscribe.
    const result = await subscribeEmail({ email, source: source ?? "website", discountCode });
    await emailWelcomeCode(email, discountCode, result.token);
    res.status(result.created ? 201 : 200).json({
      message: result.created ? "Subscribed successfully" : "Already subscribed",
      discountCode: discountCode ?? null,
    });
  } catch (err) {
    logger.error({ err, email }, "Subscribe failed");
    res.status(500).json({ error: "Could not subscribe. Please try again." });
  }
});

router.delete("/admin/subscribers/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.delete(subscribersTable).where(eq(subscribersTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/admin/subscribers", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(subscribersTable)
    .orderBy(subscribersTable.createdAt);

  // Parsed response drops unknown keys, so the opt-out state is merged back on
  // after validation.
  const parsedBody = ListSubscribersResponse.parse({
    subscribers: rows.map((r) => ({
      id: r.id,
      email: r.email,
      source: r.source ?? null,
      discountCode: r.discountCode ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
  const unsubById = new Map(rows.map((r) => [r.id, r.unsubscribedAt]));
  res.json({
    subscribers: parsedBody.subscribers.map((s) => ({
      ...s,
      unsubscribedAt: unsubById.get(s.id)?.toISOString() ?? null,
    })),
  });
});

export default router;
