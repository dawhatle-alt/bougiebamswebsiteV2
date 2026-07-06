import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAnyAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getSquareClient, getSquareLocationId, isSquareLocationConfigured } from "../lib/square";

const router: IRouter = Router();

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

function getWebOrigin(req: Request): string {
  if (process.env.PUBLIC_WEB_ORIGIN) return process.env.PUBLIC_WEB_ORIGIN;
  return (
    (req.headers["x-forwarded-proto"] ?? "https") +
    "://" +
    (req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost")
  );
}

router.post("/checkout", requireAnyAuth, async (req: Request, res: Response): Promise<void> => {
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

  if (!isSquareLocationConfigured()) {
    logger.error(
      {
        SQUARE_LOCATION_ID: JSON.stringify(process.env.SQUARE_LOCATION_ID ?? null),
        SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT ?? "(unset → sandbox)",
      },
      "Checkout blocked: SQUARE_LOCATION_ID is missing or still set to the placeholder value",
    );
    res.status(503).json({
      error: "Online checkout is not fully configured yet. Please contact us at hello@bougiebams.com to place your order.",
    });
    return;
  }

  try {
    const origin = getWebOrigin(req);
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
        locationId: getSquareLocationId(),
        lineItems,
      },
      checkoutOptions: {
        redirectUrl: `${origin}/checkout/confirmation`,
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

// Powers the post-payment confirmation screen. Square appends the order id (and
// checkout id) to the redirect URL; we look the order up so the buyer sees an
// authoritative recap of what they actually paid — the cart is client-side only
// and is gone after the round-trip to Square.
router.get("/checkout/summary", async (req: Request, res: Response): Promise<void> => {
  const client = getSquareClient();
  if (!client) {
    res.status(503).json({ error: "Order lookup is unavailable." });
    return;
  }

  const orderIdParam = typeof req.query.orderId === "string" ? req.query.orderId : "";
  const checkoutId = typeof req.query.checkoutId === "string" ? req.query.checkoutId : "";

  try {
    let orderId = orderIdParam;
    if (!orderId && checkoutId) {
      const linkRes = await client.checkout.paymentLinks.get({ id: checkoutId });
      orderId = linkRes.paymentLink?.orderId ?? "";
    }

    if (!orderId) {
      res.status(400).json({ error: "Missing order reference." });
      return;
    }

    const { order } = await client.orders.get({ orderId });
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    const toCents = (m?: { amount?: bigint | number | null } | null): number =>
      m?.amount != null ? Number(m.amount) : 0;

    res.json({
      orderId: order.id ?? orderId,
      state: order.state ?? "UNKNOWN",
      paid: order.state === "COMPLETED",
      currency: order.totalMoney?.currency ?? "USD",
      total: toCents(order.totalMoney),
      totalTax: toCents(order.totalTaxMoney),
      createdAt: order.createdAt ?? null,
      lineItems: (order.lineItems ?? []).map((li) => ({
        name: li.name ?? "Item",
        quantity: li.quantity ?? "1",
        amount: toCents(li.totalMoney ?? li.grossSalesMoney),
      })),
    });
  } catch (err) {
    logger.error({ err, orderId: orderIdParam, checkoutId }, "Failed to load checkout summary");
    res.status(502).json({ error: "Could not load order details." });
  }
});

export default router;
