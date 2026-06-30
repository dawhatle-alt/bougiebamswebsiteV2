import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";
import { sendRegistrationConfirmationEmail } from "../lib/email";

const router: IRouter = Router();

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
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      res.status(503).json({
        error:
          "Payment processing is not yet available. Contact hello@bougiebams.com to register.",
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

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);

      const origin =
        (req.headers["x-forwarded-proto"] ?? "https") +
        "://" +
        (req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost");

      const [registration] = await db
        .insert(registrationsTable)
        .values({
          eventId,
          name,
          email,
          notes: notes ?? null,
          status: "pending",
          userId: req.user!.id,
        })
        .returning();

      const priceInCents = event.priceCents ?? 0;

      if (priceInCents > 0) {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: email,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: event.title,
                  description: `${event.date} · ${event.location}`,
                },
                unit_amount: priceInCents,
              },
              quantity: 1,
            },
          ],
          metadata: {
            registrationId: String(registration.id),
            eventId: String(eventId),
          },
          success_url: `${origin}/events?registration=success`,
          cancel_url: `${origin}/events?registration=cancelled`,
        });

        await db
          .update(registrationsTable)
          .set({ paymentSessionId: session.id })
          .where(eq(registrationsTable.id, registration.id));

        res.json({ url: session.url });
      } else {
        await db
          .update(registrationsTable)
          .set({ status: "confirmed" })
          .where(eq(registrationsTable.id, registration.id));

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
  "/webhooks/stripe",
  async (req: Request & { rawBody?: Buffer }, res: Response): Promise<void> => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      res.status(503).json({ error: "Webhook not configured" });
      return;
    }

    const sig = req.headers["stripe-signature"];
    if (!sig || !req.rawBody) {
      res.status(400).json({ error: "Missing signature or body" });
      return;
    }

    let stripeEvent: import("stripe").Stripe.Event;
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);
      stripeEvent = stripe.webhooks.constructEvent(
        req.rawBody,
        sig as string,
        webhookSecret,
      );
    } catch (err) {
      logger.warn({ err }, "Stripe webhook signature verification failed");
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object as import("stripe").Stripe.Checkout.Session;
      const registrationId = session.metadata?.registrationId
        ? parseInt(session.metadata.registrationId, 10)
        : null;

      if (registrationId && !Number.isNaN(registrationId)) {
        const [reg] = await db
          .select()
          .from(registrationsTable)
          .where(eq(registrationsTable.id, registrationId))
          .limit(1);

        if (reg && reg.status === "pending") {
          await db
            .update(registrationsTable)
            .set({ status: "confirmed", paymentSessionId: session.id })
            .where(eq(registrationsTable.id, registrationId));

          const [event] = await db
            .select()
            .from(eventsTable)
            .where(eq(eventsTable.id, reg.eventId))
            .limit(1);

          await db
            .update(eventsTable)
            .set({ spotsLeft: sql`GREATEST(0, ${eventsTable.spotsLeft} - 1)` })
            .where(eq(eventsTable.id, reg.eventId));

          if (event) {
            await sendRegistrationConfirmationEmail({
              registrantName: reg.name,
              registrantEmail: reg.email,
              eventTitle: event.title,
              eventDate: event.date,
              eventTime: event.time,
              eventLocation: event.location,
              eventHost: event.host,
            });
          }

          logger.info(
            { registrationId, sessionId: session.id },
            "Registration confirmed via Stripe webhook",
          );
        }
      }
    }

    res.json({ received: true });
  },
);

export default router;
