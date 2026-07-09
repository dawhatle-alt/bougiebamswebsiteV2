import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  bizAssumptionsTable,
  bizEventsTable,
  bizMarketingChannelsTable,
  bizInventoryItemsTable,
  bizScenariosTable,
  bizConversationsTable,
  bizMessagesTable,
} from "@workspace/db";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";
import { requireAdmin } from "../middleware/auth";
import { ensureBusinessTables, ensureAdvisorTables } from "../lib/businessBootstrap";
import { computeActuals } from "../lib/businessActuals";
import { logger } from "../lib/logger";

// AI business advisor for Business HQ — ported from the BougieBams-Business
// repo and upgraded to ground its answers in real store data (orders,
// registrations, subscribers) alongside the hand-entered planning model.

const router: IRouter = Router();

const messageCreateSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

// Sequential queries — pipelined queries stall behind the transaction pooler.
async function fetchAdvisorContext(): Promise<string> {
  const assumptionRows = await db
    .select()
    .from(bizAssumptionsTable)
    .where(eq(bizAssumptionsTable.id, 1));
  const eventRows = await db.select().from(bizEventsTable).orderBy(asc(bizEventsTable.date));
  const channelRows = await db.select().from(bizMarketingChannelsTable);
  const inventoryRows = await db.select().from(bizInventoryItemsTable);
  const scenarioRows = await db.select().from(bizScenariosTable);
  const actuals = await computeActuals();

  return `
You are the AI business advisor for BougieBams — a premium mahjong lifestyle brand (bougiebams.com).
You have live data from the owner's Business HQ: the hand-entered planning model (assumptions,
planned events, marketing channels, inventory, scenarios) AND real store performance (completed
Square orders, event registrations, email subscribers). When the owner asks about performance,
prefer the REAL data and compare it against the plan. Amounts in the actuals are in cents.
Answer concisely and helpfully; use dollar signs and proper formatting when discussing numbers.

## Planning Model — Assumptions
${JSON.stringify(assumptionRows[0] ?? null, null, 2)}

## Planning Model — Marketing Events
${JSON.stringify(eventRows, null, 2)}

## Planning Model — Marketing Channels
${JSON.stringify(channelRows, null, 2)}

## Planning Model — Inventory
${JSON.stringify(inventoryRows, null, 2)}

## Planning Model — Scenarios
${JSON.stringify(scenarioRows, null, 2)}

## REAL Store Actuals (amounts in cents)
${JSON.stringify(actuals, null, 2)}
`.trim();
}

router.get("/admin/business/advisor/conversations", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureAdvisorTables();
    const rows = await db
      .select()
      .from(bizConversationsTable)
      .orderBy(asc(bizConversationsTable.createdAt));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "Failed to list advisor conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/admin/business/advisor/conversations", requireAdmin, async (req, res): Promise<void> => {
  try {
    await ensureAdvisorTables();
    const title = typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim()
      : "New conversation";
    const [row] = await db.insert(bizConversationsTable).values({ title }).returning();
    res.status(201).json(row);
  } catch (err) {
    logger.error({ err }, "Failed to create advisor conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/admin/business/advisor/conversations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  try {
    await ensureAdvisorTables();
    const [convo] = await db
      .select()
      .from(bizConversationsTable)
      .where(eq(bizConversationsTable.id, id));
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(bizMessagesTable)
      .where(eq(bizMessagesTable.conversationId, id))
      .orderBy(asc(bizMessagesTable.createdAt));
    res.json({ ...convo, messages: msgs });
  } catch (err) {
    logger.error({ err }, "Failed to fetch advisor conversation");
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

router.delete("/admin/business/advisor/conversations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  try {
    await ensureAdvisorTables();
    const deleted = await db
      .delete(bizConversationsTable)
      .where(eq(bizConversationsTable.id, id))
      .returning();
    if (!deleted.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "Failed to delete advisor conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// Streaming SSE chat: persists the user message, streams the reply, persists it.
router.post("/admin/business/advisor/conversations/:id/messages", requireAdmin, async (req, res): Promise<void> => {
  const conversationId = parseInt(req.params.id as string, 10);
  if (!Number.isInteger(conversationId)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  const parsed = messageCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    await ensureAdvisorTables();
    await ensureBusinessTables();

    const [convo] = await db
      .select()
      .from(bizConversationsTable)
      .where(eq(bizConversationsTable.id, conversationId));
    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db.insert(bizMessagesTable).values({
      conversationId,
      role: "user",
      content: parsed.data.content,
    });

    const history = await db
      .select()
      .from(bizMessagesTable)
      .where(eq(bizMessagesTable.conversationId, conversationId))
      .orderBy(asc(bizMessagesTable.createdAt));

    const systemPrompt = await fetchAdvisorContext();

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let fullResponse = "";
    const stream = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 4096,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
        (res as unknown as { flush?: () => void }).flush?.();
      }
    }

    if (fullResponse) {
      await db.insert(bizMessagesTable).values({
        conversationId,
        role: "assistant",
        content: fullResponse,
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "Advisor streaming failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Advisor error, please try again." });
      return;
    }
    res.write(`data: ${JSON.stringify({ error: "Advisor error, please try again." })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

export default router;
