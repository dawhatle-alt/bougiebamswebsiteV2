import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import { CreateRegistrationBody } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";

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

router.post("/registrations", async (req, res): Promise<void> => {
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

  if (event.spotsLeft <= 0) {
    res.status(400).json({ error: "This event is sold out" });
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
      userId: req.isAuthenticated() ? req.user!.id : null,
    })
    .returning();

  await db
    .update(eventsTable)
    .set({ spotsLeft: event.spotsLeft - 1 })
    .where(eq(eventsTable.id, eventId));

  res.status(201).json({ registration: toRegResponse(reg) });
});

router.get("/registrations/mine", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const rows = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.userId, userId))
    .orderBy(registrationsTable.createdAt);

  res.json({ registrations: rows.map(toRegResponse) });
});

router.get("/registrations/:id", requireAuth, async (req, res): Promise<void> => {
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

  if (reg.userId !== req.user!.id && !req.isAuthenticated()) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  res.json({ registration: toRegResponse(reg) });
});

export default router;
