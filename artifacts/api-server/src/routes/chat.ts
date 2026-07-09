import { Router, type IRouter } from "express";
import { z } from "zod";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { productsTable, eventsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ChatRequestBody = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1)
    .max(20),
});

async function buildSystemPrompt(): Promise<string> {
  // Sequential: concurrent queries on one connection stall behind the transaction pooler
  const products = await db.select({ name: productsTable.name, description: productsTable.description, price: productsTable.price, category: productsTable.category, inStock: productsTable.inStock }).from(productsTable).where(eq(productsTable.inStock, true));
  const events = await db.select({ id: eventsTable.id, title: eventsTable.title, date: eventsTable.date, time: eventsTable.time, location: eventsTable.location, priceCents: eventsTable.priceCents, spotsLeft: eventsTable.spotsLeft }).from(eventsTable).where(eq(eventsTable.published, true));

  const productList = products.length > 0
    ? products.map((p) => `- ${p.name} (${p.category}): $${p.price}`).join("\n")
    : "No products currently available.";

  const eventList = events.length > 0
    ? events.map((e) => `- ${e.title} -- ${e.date} at ${e.time}, ${e.location} | ${e.priceCents ? `$${(e.priceCents / 100).toFixed(2)}` : "Free"} | ${e.spotsLeft > 0 ? `${e.spotsLeft} spots left` : "Sold out"} | /events/${e.id}`).join("\n")
    : "No upcoming events.";

  return `You are the BougieBams Assistant -- a warm and knowledgeable guide for the BougieBams mahjong lifestyle community.

## Products
${productList}

## Events
${eventList}

Be helpful, warm, and on-brand. For event registration, link to /events/{id}. Never invent products or events.`;
}

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = ChatRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { messages } = parsed.data;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const systemPrompt = await buildSystemPrompt();
    const stream = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
        (res as unknown as { flush?: () => void }).flush?.();
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "Chat streaming error");
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
    res.end();
  }
});

export default router;