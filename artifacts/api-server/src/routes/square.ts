import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";
import { sendRegistrationConfirmationEmail } from "../lib/email";
import { getSquareClient, getSquareLocationId, isSandboxMode } from "../lib/square";

const router: IRouter = Router();

function getOrigin(req: Request): string {
  return (
    (req.headers["x-forwarded-proto"] ?? "https") +
    "://" +
    (req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost")
  );
}

const RegistrationCheckoutBody = z.object({
  eventId: z.number().int().positive(),
  name: z.string().min(1),
  email: z.string().email(),
  notes: z.string().optional(),
  redirectBase: z.string().optional(),
});

router.post(
  "/registrations/checkout",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const client = getSquareClient();
    if (!client) {
      res.status(503).json({
        error: "Payment processing is not yet available. Contact hello@bougiebams.com to register.",
      });
      return;
    }

    const parsed = RegistrationCheckoutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
      return;
    }

    const { eventId, name, email, notes, redirectBase } = parsed.data;

    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .limit(1);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (event.spotsLeft <= 0) {
      res.status(409).json({ error: "This event is sold out" });
      return;
    }

    const priceInCents = event.priceCents ?? 0;
    const origin = getOrigin(req);

    try {
      const [registration] = await db
        .insert(registrationsTable)
        .values({
          eventId,
          name,
          email,
          notes: notes ?? null,
          status: priceInCents > 0 ? "pending" : "confirmed",
          userId: req.user!.id,
        })
        .returning();

      if (priceInCents > 0) {
        const idempotencyKey = `reg-${registration.id}-${Date.now()}`;
        const locationId = getSquareLocationId();

        const response = await client.checkout.paymentLinks.create({
          idempotencyKey,
          order: {
            locationId,
            lineItems: [
              {
                name: event.title,
                note: `${event.date} · ${event.location}`,
                quantity: "1",
                basePriceMoney: {
                  amount: BigInt(priceInCents),
                  currency: "USD",
                },
              },
            ],
            referenceId: String(registration.id),
          },
          checkoutOptions: {
            redirectUrl: `${redirectBase || origin}/events/confirmation`,
            askForShippingAddress: false,
          },
          prePopulatedData: {
            buyerEmail: email,
          },
        });

        const url = response.paymentLink?.url;
        if (!url) {
          throw new Error("Square did not return a checkout URL");
        }

        await db
          .update(registrationsTable)
          .set({ paymentSessionId: response.paymentLink?.id ?? null })
          .where(eq(registrationsTable.id, registration.id));

        res.json({ url });
      } else {
        await db
          .update(eventsTable)
          .set({ spotsLeft: sql`GREATEST(0, ${eventsTable.spotsLeft} - 1)` })
          .where(eq(eventsTable.id, eventId));

        await sendRegistrationConfirmationEmail({
          registrantName: name,
          registrantEmail: email,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          eventHost: event.host,
        });

        res.json({ url: `${origin}/events?registration=success` });
      }
    } catch (err) {
      logger.error({ err }, "Registration checkout error");
      res.status(500).json({ error: "Could not process registration. Please try again." });
    }
  },
);

async function confirmRegistration(registrationId: number, paymentId: string | null, eventId: number) {
  const [reg] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, registrationId))
    .limit(1);

  if (!reg || reg.status !== "pending") return;

  await db
    .update(registrationsTable)
    .set({ status: "confirmed", paymentSessionId: paymentId })
    .where(eq(registrationsTable.id, registrationId));

  const [evt] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  await db
    .update(eventsTable)
    .set({ spotsLeft: sql`GREATEST(0, ${eventsTable.spotsLeft} - 1)` })
    .where(eq(eventsTable.id, eventId));

  if (evt) {
    await sendRegistrationConfirmationEmail({
      registrantName: reg.name,
      registrantEmail: reg.email,
      eventTitle: evt.title,
      eventDate: evt.date,
      eventTime: evt.time,
      eventLocation: evt.location,
      eventHost: evt.host,
    });
  }

  logger.info({ registrationId, paymentId }, "Registration confirmed via Square webhook");
}

router.post(
  "/webhooks/square",
  async (req: Request & { rawBody?: Buffer }, res: Response): Promise<void> => {
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL;

    // Signature verification policy:
    // - If SQUARE_WEBHOOK_SIGNATURE_KEY is set, verification is always attempted.
    //   Any missing prerequisite (URL, raw body) is a hard reject in production,
    //   or a logged warning in sandbox mode (allows local testing without a URL).
    // - If the key is not set at all, warn and proceed (key hasn't been configured yet).
    const sandbox = isSandboxMode();

    if (sigKey) {
      if (!notificationUrl) {
        if (sandbox) {
          logger.warn("SQUARE_WEBHOOK_URL not set — skipping signature check (sandbox mode)");
        } else {
          logger.error("SQUARE_WEBHOOK_URL not set — rejecting webhook (set this env var after deploy)");
          res.status(503).json({ error: "Webhook not fully configured" });
          return;
        }
      } else if (!req.rawBody) {
        logger.error("Square webhook: raw body unavailable — rejecting");
        res.status(400).json({ error: "Webhook body unavailable" });
        return;
      } else {
        try {
          const { WebhooksHelper } = require("square");
          const body = req.rawBody.toString("utf8");
          const signature = req.headers["x-square-hmacsha256-signature"] as string;
          const isValid = WebhooksHelper.isValidWebhookEventSignature(
            body,
            signature,
            sigKey,
            notificationUrl,
          );
          if (!isValid) {
            logger.warn("Square webhook signature verification failed — rejecting");
            res.status(400).json({ error: "Invalid webhook signature" });
            return;
          }
        } catch (err) {
          logger.warn({ err }, "Square webhook signature check threw — rejecting");
          res.status(400).json({ error: "Webhook verification error" });
          return;
        }
      }
    } else {
      logger.warn("SQUARE_WEBHOOK_SIGNATURE_KEY not set — skipping signature verification");
    }

    const event = req.body as {
      type?: string;
      data?: {
        object?: {
          payment?: {
            id?: string;
            order_id?: string;
            status?: string;
          };
        };
      };
    };

    const eventType = event.type;
    const payment = event.data?.object?.payment;

    // Handle both payment.completed and payment.updated (status=COMPLETED)
    const isPaymentCompleted =
      eventType === "payment.completed" ||
      (eventType === "payment.updated" && payment?.status === "COMPLETED");

    if (isPaymentCompleted && payment?.order_id) {
      try {
        const client = getSquareClient();
        if (!client) {
          res.json({ received: true });
          return;
        }

        const orderRes = await client.orders.get({ orderId: payment.order_id });
        const referenceId = orderRes.order?.referenceId;

        if (referenceId) {
          const registrationId = parseInt(referenceId, 10);
          if (!Number.isNaN(registrationId)) {
            const eventId = orderRes.order?.lineItems?.[0] ? parseInt(
              orderRes.order.metadata?.eventId ?? "0", 10
            ) : 0;

            // Look up eventId from the registration row itself
            const [reg] = await db
              .select()
              .from(registrationsTable)
              .where(eq(registrationsTable.id, registrationId))
              .limit(1);

            if (reg) {
              await confirmRegistration(registrationId, payment.id ?? null, reg.eventId);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "Error processing Square payment webhook");
      }
    }

    res.json({ received: true });
  },
);

export default router;
