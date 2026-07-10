import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import { CreateRegistrationBody } from "@workspace/api-zod";
import { requireAuth, requireAnyAuth } from "../middleware/auth";
import { sendRegistrationConfirmationEmail } from "../lib/email";
import { getSquareClient } from "../lib/square";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function toRegResponse(reg: typeof registrationsTable.$inferSelect) {
  return {
    id: reg.id,
    eventId: reg.eventId,
    name: reg.name,
    email: reg.email,
    notes: reg.notes ?? null,
    status: reg.status,
    createdAt: reg.createdAt.toISOString(),
  };
}

router.post("/registrations", requireAnyAuth, async (req, res): Promise<void> => {
  const parsed = CreateRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { eventId, name, email, notes } = parsed.data;

  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId));

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  if (event.externalRegistrationUrl) {
    res.status(400).json({ error: "Registration for this event is handled on an external site." });
    return;
  }

  if (event.spotsLeft <= 0) {
    res.status(400).json({ error: "This event is sold out" });
    return;
  }

  if (event.priceCents !== null && event.priceCents > 0) {
    res.status(400).json({
      error: "This is a paid event. Use POST /registrations/checkout to register.",
    });
    return;
  }

  const [reg] = await db
    .insert(registrationsTable)
    .values({
      eventId,
      name,
      email,
      notes: notes ?? null,
      status: "confirmed",
      userId: req.isAuthenticated() ? req.user!.id : (req.shopperUser?.sub ?? null),
    })
    .returning();

  await db
    .update(eventsTable)
    .set({ spotsLeft: event.spotsLeft - 1 })
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

  res.status(201).json({ registration: toRegResponse(reg) });
});

router.get("/registrations/mine", requireAnyAuth, async (req, res): Promise<void> => {
  const userId = req.isAuthenticated() ? req.user!.id : req.shopperUser!.sub;
  const rows = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.userId, userId))
    .orderBy(registrationsTable.createdAt);

  res.json({ registrations: rows.map(toRegResponse) });
});

router.get("/registrations/by-checkout/:checkoutId", async (req, res): Promise<void> => {
  const checkoutId = req.params.checkoutId as string;
  if (!checkoutId) {
    res.status(400).json({ error: "Missing checkoutId" });
    return;
  }

  const rows = await db
    .select({
      regId: registrationsTable.id,
      regName: registrationsTable.name,
      regEmail: registrationsTable.email,
      regNotes: registrationsTable.notes,
      regStatus: registrationsTable.status,
      regCreatedAt: registrationsTable.createdAt,
      eventId: eventsTable.id,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.date,
      eventTime: eventsTable.time,
      eventLocation: eventsTable.location,
      eventHost: eventsTable.host,
      eventPriceCents: eventsTable.priceCents,
      eventImagePath: eventsTable.imagePath,
    })
    .from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(eq(registrationsTable.paymentSessionId, checkoutId))
    .limit(1);

  if (!rows[0]) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  const r = rows[0];
  res.json({
    registration: {
      id: r.regId,
      name: r.regName,
      email: r.regEmail,
      notes: r.regNotes ?? null,
      status: r.regStatus,
      createdAt: r.regCreatedAt.toISOString(),
      event: {
        id: r.eventId,
        title: r.eventTitle,
        date: r.eventDate,
        time: r.eventTime,
        location: r.eventLocation,
        host: r.eventHost,
        priceCents: r.eventPriceCents ?? 0,
        imagePath: r.eventImagePath ?? null,
      },
    },
  });
});

router.get("/registrations/:id/confirmation", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const rows = await db
    .select({
      regId: registrationsTable.id,
      regName: registrationsTable.name,
      regEmail: registrationsTable.email,
      regNotes: registrationsTable.notes,
      regStatus: registrationsTable.status,
      regCreatedAt: registrationsTable.createdAt,
      eventId: eventsTable.id,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.date,
      eventTime: eventsTable.time,
      eventLocation: eventsTable.location,
      eventHost: eventsTable.host,
      eventPriceCents: eventsTable.priceCents,
      eventImagePath: eventsTable.imagePath,
    })
    .from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(eq(registrationsTable.id, id))
    .limit(1);

  if (!rows[0]) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  const r = rows[0];
  res.json({
    registration: {
      id: r.regId,
      name: r.regName,
      email: r.regEmail,
      notes: r.regNotes ?? null,
      status: r.regStatus,
      createdAt: r.regCreatedAt.toISOString(),
      event: {
        id: r.eventId,
        title: r.eventTitle,
        date: r.eventDate,
        time: r.eventTime,
        location: r.eventLocation,
        host: r.eventHost,
        priceCents: r.eventPriceCents ?? 0,
        imagePath: r.eventImagePath ?? null,
      },
    },
  });
});

router.get("/registrations/:id", requireAnyAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [reg] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, id))
    .limit(1);

  if (!reg) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  const currentUserId = req.isAuthenticated() ? req.user!.id : req.shopperUser!.sub;
  const adminUserIds = process.env.ADMIN_USER_IDS
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAdmin =
    req.isAuthenticated() &&
    adminUserIds &&
    adminUserIds.length > 0 &&
    adminUserIds.includes(req.user!.id);
  if (reg.userId !== currentUserId && !isAdmin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  res.json({ registration: toRegResponse(reg) });
});

router.post("/registrations/:id/verify-payment", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const rows = await db
    .select({
      reg: registrationsTable,
      evt: eventsTable,
    })
    .from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(eq(registrationsTable.id, id))
    .limit(1);

  if (!rows[0]) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  const { reg, evt } = rows[0];

  if (reg.status === "confirmed") {
    res.json({ status: "confirmed" });
    return;
  }

  if (!reg.paymentSessionId) {
    res.json({ status: reg.status });
    return;
  }

  try {
    const client = getSquareClient();
    if (!client) {
      res.json({ status: reg.status });
      return;
    }

    const linkRes = await client.checkout.paymentLinks.get({ id: reg.paymentSessionId });
    const orderId = linkRes.paymentLink?.orderId;

    if (!orderId) {
      res.json({ status: reg.status });
      return;
    }

    const orderRes = await client.orders.get({ orderId });
    const order = orderRes.order;
    const tenders = (order as any)?.tenders as Array<{ id?: string; amount_money?: unknown }> | undefined;
    const isPaid = Array.isArray(tenders) && tenders.length > 0;

    if (isPaid) {
      const paymentId = tenders[0]?.id ?? null;

      await db
        .update(registrationsTable)
        .set({ status: "confirmed" })
        .where(eq(registrationsTable.id, id));

      await db
        .update(eventsTable)
        .set({ spotsLeft: sql`GREATEST(0, ${eventsTable.spotsLeft} - 1)` })
        .where(eq(eventsTable.id, reg.eventId));

      await sendRegistrationConfirmationEmail({
        registrantName: reg.name,
        registrantEmail: reg.email,
        eventTitle: evt.title,
        eventDate: evt.date,
        eventTime: evt.time,
        eventLocation: evt.location,
        eventHost: evt.host,
      });

      logger.info({ registrationId: id, orderId }, "Registration confirmed via payment verification");
      res.json({ status: "confirmed" });
    } else {
      res.json({ status: reg.status });
    }
  } catch (err) {
    logger.error({ err }, "Error verifying payment with Square");
    res.json({ status: reg.status });
  }
});

export default router;
