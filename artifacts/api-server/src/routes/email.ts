import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const EventRegistrationBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  eventTitle: z.string().min(1),
  eventDate: z.string().optional(),
  eventLocation: z.string().optional(),
  eventPrice: z.number().optional(),
});

router.post("/email/event-registration", async (req, res): Promise<void> => {
  const parsed = EventRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration data" });
    return;
  }

  const { name, email, eventTitle } = parsed.data;

  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.title, eventTitle))
      .limit(1);

    if (event) {
      await db
        .insert(registrationsTable)
        .values({
          eventId: event.id,
          name,
          email,
          notes: `Registered via website for ${eventTitle}`,
        })
        .onConflictDoNothing();

      if (event.spotsLeft > 0) {
        await db
          .update(eventsTable)
          .set({ spotsLeft: event.spotsLeft - 1 })
          .where(eq(eventsTable.id, event.id));
      }
    } else {
      logger.info({ eventTitle, email }, "Event registration: event not found in DB, recorded as note");
    }

    logger.info({ name, email, eventTitle }, "Event registration received");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Event registration error");
    res.json({ success: true });
  }
});

export default router;
