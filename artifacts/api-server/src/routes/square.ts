import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";
import { sendRegistrationConfirmationEmail } from "../lib/email";

const router: IRouter = Router();

function getSquareClient() {
  const { SquareClient, SquareEnvironment } = require("square");
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return null;
  const env = process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
  return new SquareClient({ token, environment: env });
}

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

    const { eventId, name, email, notes } = parsed.data;

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

        const response = await client.checkout.paymentLinks.create({
          idempotencyKey,
          order: {
            locationId: process.env.SQUARE_LOCATION_ID ?? "",
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
            redirectUrl: `${origin}/events?registration=success`,
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

router.post(
  "/webhooks/square",
  async (req: Request & { rawBody?: Buffer }, res: Response): Promise<void> => {
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL;

    if (sigKey && notificationUrl && req.rawBody) {
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
          logger.warn("Square webhook signature verification failed");
          res.status(400).json({ error: "Invalid webhook signature" });
          return;
        }
      } catch (err) {
        logger.warn({ err }, "Square webhook signature check error — proceeding in sandbox mode");
      }
    } else {
      logger.warn("Square webhook signature key or URL not set — skipping verification (sandbox mode)");
    }

    const event = req.body as { type?: string; data?: { object?: { payment?: { order_id?: string; status?: string; id?: string } } } };

    if (event.type === "payment.completed") {
      const payment = event.data?.object?.payment;
      const orderId = payment?.order_id;

      if (orderId) {
        try {
          const client = getSquareClient();
          if (!client) {
            res.json({ received: true });
            return;
          }

          const orderRes = await client.orders.get({ orderId });
          const referenceId = orderRes.order?.referenceId;

          if (referenceId) {
            const registrationId = parseInt(referenceId, 10);
            if (!Number.isNaN(registrationId)) {
              const [reg] = await db
                .select()
                .from(registrationsTable)
                .where(eq(registrationsTable.id, registrationId))
                .limit(1);

              if (reg && reg.status === "pending") {
                await db
                  .update(registrationsTable)
                  .set({ status: "confirmed", paymentSessionId: payment?.id ?? null })
                  .where(eq(registrationsTable.id, registrationId));

                const [evt] = await db
                  .select()
                  .from(eventsTable)
                  .where(eq(eventsTable.id, reg.eventId))
                  .limit(1);

                await db
                  .update(eventsTable)
                  .set({ spotsLeft: sql`GREATEST(0, ${eventsTable.spotsLeft} - 1)` })
                  .where(eq(eventsTable.id, reg.eventId));

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

                logger.info({ registrationId, paymentId: payment?.id }, "Registration confirmed via Square webhook");
              }
            }
          }
        } catch (err) {
          logger.error({ err }, "Error processing Square payment.completed webhook");
        }
      }
    }

    res.json({ received: true });
  },
);

export default router;
