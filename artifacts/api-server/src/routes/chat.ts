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

/**
 * Retrieve relevant knowledge base articles from the OpenAI vector store
 * (synced from the bougie-bams-knowledge-base repo by GitHub Actions).
 * Fails soft: if the store is unavailable or KB_VECTOR_STORE_ID is unset,
 * the chat still works from the live product/event data.
 */
async function searchKnowledgeBase(query: string): Promise<string> {
  const storeId = process.env.KB_VECTOR_STORE_ID;
  if (!storeId || !query.trim()) return "";
  try {
    const results = await getOpenAIClient().vectorStores.search(storeId, {
      query,
      max_num_results: 6,
    });
    const blocks: string[] = [];
    for await (const result of results) {
      const text = result.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");
      if (text) blocks.push(`[Source: ${result.filename}]\n${text}`);
    }
    return blocks.join("\n\n---\n\n");
  } catch (err) {
    logger.warn({ err }, "Knowledge base search failed; continuing without KB context");
    return "";
  }
}

async function buildSystemPrompt(kbContext: string): Promise<string> {
  // Sequential: concurrent queries on one connection stall behind the transaction pooler
  const products = await db.select({ name: productsTable.name, description: productsTable.description, price: productsTable.price, category: productsTable.category, inStock: productsTable.inStock }).from(productsTable).where(eq(productsTable.inStock, true));
  const events = await db.select({ id: eventsTable.id, title: eventsTable.title, date: eventsTable.date, time: eventsTable.time, location: eventsTable.location, priceCents: eventsTable.priceCents, spotsLeft: eventsTable.spotsLeft }).from(eventsTable).where(eq(eventsTable.published, true));

  const productList = products.length > 0
    ? products.map((p) => `- ${p.name} (${p.category}): $${p.price}`).join("\n")
    : "No products currently available.";

  const eventList = events.length > 0
    ? events.map((e) => `- ${e.title} -- ${e.date} at ${e.time}, ${e.location} | ${e.priceCents ? `$${(e.priceCents / 100).toFixed(2)}` : "Free"} | ${e.spotsLeft > 0 ? `${e.spotsLeft} spots left` : "Sold out"} | /events/${e.id}`).join("\n")
    : "No upcoming events.";

  const kbSection = kbContext
    ? `

## Knowledge Base (source of truth)
The following articles were retrieved from the BougieBams knowledge base. Ground your answers in them:

${kbContext}`
    : "";

  return `You are the BougieBams Assistant -- a warm and knowledgeable guide for the BougieBams mahjong lifestyle community, founded by Patsy Miller in Texas.

## Products (live inventory)
${productList}

## Events (live schedule)
${eventList}${kbSection}

Rules:
- Be helpful, warm, and on-brand. For event registration, link to /events/{id}.
- Never invent products, prices, events, or policies. The live lists above are authoritative for prices and dates; the knowledge base is authoritative for policies, mahjong rules, and company information.
- If knowledge base content is marked "needs_review" or "DRAFT", present it as general guidance and suggest confirming with patsy@bougiebams.com.
- For official American Mahjong rule interpretations, note that the current NMJL card and rulebook are authoritative. Never recite annual card hands.
- If the answer is not in the context above, say so and direct the customer to patsy@bougiebams.com.`;
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
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const kbContext = await searchKnowledgeBase(lastUserMessage);
    const systemPrompt = await buildSystemPrompt(kbContext);
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
