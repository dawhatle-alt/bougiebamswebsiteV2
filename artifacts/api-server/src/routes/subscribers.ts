import { Router, type IRouter } from "express";
import { db, subscribersTable } from "@workspace/db";
import {
  SubscribeBody,
  ListSubscribersResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

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
    res.status(200).json({ message: "Already subscribed", discountCode: discountCode ?? null });
    return;
  }

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
