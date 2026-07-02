import { Router } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db, subscribersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createRateLimiter } from "../lib/rateLimit";

const router = Router();
const connectors = new ReplitConnectors();

const FROM_ADDRESS = "BougieBams <onboarding@resend.dev>";
const DISCOUNT_CODE = "BOUGIE15";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Subscribing writes to the DB and sends a welcome email — throttle per IP so it
// can't be used to bomb arbitrary addresses or pollute the subscriber table.
const subscribeRateLimit = createRateLimiter({
  windowMs: 1000 * 60 * 10,
  max: 5,
  prefix: "subscribe",
});

router.post("/subscribe", subscribeRateLimit, async (req, res) => {
  const rawEmail =
    typeof req.body?.email === "string" ? req.body.email.trim() : "";

  if (!EMAIL_REGEX.test(rawEmail)) {
    return res
      .status(400)
      .json({ error: "Please enter a valid email address" });
  }

  const email = rawEmail.toLowerCase();

  try {
    const inserted = await db
      .insert(subscribersTable)
      .values({
        email,
        source: "welcome_popup",
        discountCode: DISCOUNT_CODE,
      })
      .onConflictDoNothing({ target: subscribersTable.email })
      .returning({ id: subscribersTable.id });

    const isNewSubscriber = inserted.length > 0;

    if (isNewSubscriber) {
      try {
        const response = await connectors.proxy("resend", "/emails", {
          method: "POST",
          body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [email],
            subject: "Your 15% welcome offer from BougieBams",
            html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1E2A5A;">
              <div style="background: #1E2A5A; padding: 32px; text-align: center;">
                <h1 style="color: #D4AF37; font-size: 28px; margin: 0; letter-spacing: 2px;">BougieBams</h1>
                <p style="color: rgba(245,240,234,0.7); margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Welcome to the table</p>
              </div>
              <div style="padding: 40px 32px; background: #FAF7F0; border: 1px solid #E2DBCD; text-align: center;">
                <p style="font-size: 13px; font-family: Inter, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #D4AF37; margin: 0 0 16px;">A little something to start</p>
                <h2 style="font-size: 30px; margin: 0 0 12px;">15% off your first order</h2>
                <p style="font-size: 16px; color: #5A6178; margin: 0 0 28px; line-height: 1.6;">Thank you for joining the BougieBams community. Use the code below at checkout.</p>
                <div style="background: white; border: 2px dashed #D4AF37; border-radius: 4px; padding: 20px 32px; display: inline-block;">
                  <span style="font-family: Inter, sans-serif; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #1E2A5A;">${DISCOUNT_CODE}</span>
                </div>
              </div>
              <div style="padding: 20px 32px; background: #1E2A5A; text-align: center;">
                <p style="color: rgba(245,240,234,0.5); font-size: 12px; margin: 0; font-family: Inter, sans-serif;">BougieBams · Where Style Meets the Table</p>
              </div>
            </div>
          `,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          req.log.warn(
            { status: response.status, text },
            "Welcome email failed to send",
          );
        }
      } catch (emailErr) {
        req.log.warn({ err: emailErr }, "Welcome email failed to send");
      }
    }

    return res.json({ success: true, discountCode: DISCOUNT_CODE });
  } catch (err) {
    req.log.error({ err }, "Failed to save subscriber");
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
