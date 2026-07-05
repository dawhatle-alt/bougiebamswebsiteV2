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
  const [products, events] = await Promise.all([
    db
      .select({
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        category: productsTable.category,
        inStock: productsTable.inStock,
      })
      .from(productsTable)
      .where(eq(productsTable.inStock, true)),
    db
      .select({
        id: eventsTable.id,
        title: eventsTable.title,
        description: eventsTable.description,
        date: eventsTable.date,
        time: eventsTable.time,
        location: eventsTable.location,
        priceCents: eventsTable.priceCents,
        category: eventsTable.category,
        spotsLeft: eventsTable.spotsLeft,
      })
      .from(eventsTable)
      .where(eq(eventsTable.published, true)),
  ]);

  const productList =
    products.length > 0
      ? products
          .map(
            (p) =>
              `- ${p.name} (${p.category}): $${p.price}${p.description ? ` -- ${p.description}` : ""}`,
          )
          .join("\n")
      : "No products currently available.";

  const eventList =
    events.length > 0
      ? events
          .map(
            (e) =>
              `- **${e.title}** (ID: ${e.id}) -- ${e.date} at ${e.time}, ${e.location} | ${e.priceCents ? `$${(e.priceCents / 100).toFixed(2)}` : "Free"} | ${e.spotsLeft > 0 ? `${e.spotsLeft} spots left` : "Sold out"} | Registration link: /events/${e.id}`,
          )
          .join("\n")
      : "No upcoming events at this time.";

  return `You are the BougieBams Assistant -- a knowledgeable, warm, and elegant guide for the BougieBams community. BougieBams is a mahjong lifestyle brand founded by a passionate mahjong player who wants to bring style, community, and education to the game.

Your two areas of expertise:
1. **Mahjong** -- rules, how to play, tile types, scoring, strategy, game flow, etiquette, and variations (American, Chinese, Japanese, etc.)
2. **BougieBams** -- the brand, its products, upcoming events, and community

## Current BougieBams Products
${productList}

## Upcoming BougieBams Events
${eventList}

## Your behavior
- Be warm, knowledgeable, and on-brand
- For mahjong questions, give clear, accurate, and helpful answers.
- For product questions, refer to the list above.
- For event questions, share the details and always include the registration link: [Register for EVENT_NAME](/events/EVENT_ID)
- Never make up products, prices, or event details that are not in the lists above.`;
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
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
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