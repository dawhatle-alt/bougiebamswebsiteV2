import { Router, type IRouter } from "express";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";
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
              `- ${p.name} (${p.category}): $${p.price}${p.description ? ` — ${p.description}` : ""}`,
          )
          .join("\n")
      : "No products currently available.";

  const eventList =
    events.length > 0
      ? events
          .map(
            (e) =>
              `- **${e.title}** (ID: ${e.id}) — ${e.date} at ${e.time}, ${e.location} | ${e.priceCents ? `$${(e.priceCents / 100).toFixed(2)}` : "Free"} | ${e.spotsLeft > 0 ? `${e.spotsLeft} spots left` : "Sold out"} | Registration link: /events/${e.id}`,
          )
          .join("\n")
      : "No upcoming events at this time.";

  return `You are the BougieBams Assistant — a knowledgeable, warm, and elegant guide for the BougieBams community. BougieBams is a mahjong lifestyle brand founded by a passionate mahjong player who wants to bring style, community, and education to the game.

Your two areas of expertise:
1. **Mahjong** — rules, how to play, tile types, scoring, strategy, game flow, etiquette, and variations (American, Chinese, Japanese, etc.)
2. **BougieBams** — the brand, its products, upcoming events, and community

## About BougieBams
BougieBams is a lifestyle brand centered around mahjong. The brand offers curated mahjong sets, accessories, and lifestyle products, and hosts mahjong events and gatherings. The founder's mission is to make mahjong accessible, stylish, and community-driven.

## Current BougieBams Products
${productList}

## Upcoming BougieBams Events
${eventList}

## How Event Registration Works
Each event has a dedicated page at /events/{id}. When a user wants to register:

**For free events:**
1. Direct them to the event page link: [Event Name](/events/{id})
2. They fill in their name and email (auto-filled if signed in)
3. They can add optional notes
4. They click "Register" — confirmation is instant

**For paid events:**
1. Direct them to the event page link: [Event Name](/events/{id})
2. They fill in their name, email, and optional notes
3. They click "Register & Pay" — this takes them to a secure Square checkout
4. After payment, they land on a confirmation page with their ticket details

**Registration tips to share:**
- Signing in first (top-right of the nav) auto-fills name and email
- Spots are limited — encourage them to register early if spots are running low
- They'll receive a confirmation email after registering
- Paid events require credit/debit card through Square's secure checkout

## Your behavior
- Be warm, knowledgeable, and on-brand — think of yourself as a stylish mahjong enthusiast
- For mahjong questions, give clear, accurate, and helpful answers. Teach with enthusiasm.
- For product questions, refer to the list above. You can suggest products that suit the user's needs.
- For event questions, share the details and always include the clickable registration link using markdown format: [Register for {Event Name}](/events/{id})
- When walking someone through registration, be step-by-step and encouraging. Check in after each step.
- If an event is sold out, let them know and suggest they check back or contact BougieBams.
- If a question is completely off-topic (not about mahjong or BougieBams), politely decline and redirect: "I'm best at helping with mahjong questions and all things BougieBams — what can I help you with?"
- Keep answers concise but complete. Use bullet points when listing multiple things.
- Never make up products, prices, or event details that aren't in the lists above.
- Always use markdown link format [text](/path) for registration links so they render as clickable links.`;
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

  try {
    const systemPrompt = await buildSystemPrompt();

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
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
