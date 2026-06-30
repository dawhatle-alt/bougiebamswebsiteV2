import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getSquareClient() {
  const { SquareClient, SquareEnvironment } = require("square");
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return null;
  const env = process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
  return new SquareClient({ token, environment: env });
}

const CheckoutBody = z.object({
  items: z.array(
    z.object({
      variationId: z.string(),
      name: z.string(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
    }),
  ).min(1),
  email: z.string().email().optional(),
  discountCode: z.string().optional(),
});

router.post("/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid checkout request: " + parsed.error.issues[0]?.message });
    return;
  }

  const client = getSquareClient();
  if (!client) {
    res.status(503).json({
      error: "Online checkout is not yet available. Please contact us at hello@bougiebams.com to place your order.",
    });
    return;
  }

  try {
    const origin =
      (req.headers["x-forwarded-proto"] ?? "https") +
      "://" +
      (req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost");

    const { items, email } = parsed.data;
    const idempotencyKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const lineItems = items.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: BigInt(Math.round(item.price * 100)),
        currency: "USD",
      },
    }));

    const response = await client.checkout.paymentLinks.create({
      idempotencyKey,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID ?? "",
        lineItems,
      },
      checkoutOptions: {
        redirectUrl: `${origin}/?checkout=success`,
        askForShippingAddress: true,
      },
      ...(email ? { prePopulatedData: { buyerEmail: email } } : {}),
    });

    const url = response.paymentLink?.url;
    if (!url) {
      throw new Error("Square did not return a checkout URL");
    }

    res.json({ url });
  } catch (err) {
    logger.error({ err }, "Square product checkout error");
    res.status(500).json({ error: "Could not create checkout session. Please try again." });
  }
});

export default router;
