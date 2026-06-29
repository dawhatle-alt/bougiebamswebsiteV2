import { Router, type IRouter } from "express";
import { z } from "zod";

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

router.post("/checkout", async (req, res): Promise<void> => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid checkout request: " + parsed.error.issues[0]?.message });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(503).json({
      error:
        "Online checkout is not yet available. Please contact us at hello@bougiebams.com to place your order.",
    });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const origin =
      (req.headers["x-forwarded-proto"] ?? "https") +
      "://" +
      (req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost");

    const lineItems = parsed.data.items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          metadata: { variationId: item.variationId },
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    };

    if (parsed.data.email) {
      sessionParams.customer_email = parsed.data.email;
    }

    if (parsed.data.discountCode) {
      sessionParams.discounts = [{ coupon: parsed.data.discountCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err);
    res.status(500).json({ error: "Could not create checkout session. Please try again." });
  }
});

export default router;
