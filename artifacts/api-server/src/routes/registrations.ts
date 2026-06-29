import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import { CreateRegistrationBody } from "@workspace/api-zod";

const router: IRouter = Router();

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
    .values({ eventId, name, email, notes: notes ?? null })
    .returning();

  await db
    .update(eventsTable)
    .set({ spotsLeft: event.spotsLeft - 1 })
    .where(eq(eventsTable.id, eventId));

  res.status(201).json({
    registration: {
      id: reg.id,
      eventId: reg.eventId,
      name: reg.name,
      email: reg.email,
      notes: reg.notes ?? null,
      createdAt: reg.createdAt.toISOString(),
    },
  });
});

export default router;
