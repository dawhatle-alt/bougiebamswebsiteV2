import { Router, type IRouter } from "express";
import { z } from "zod";

const router: IRouter = Router();

const CheckoutBody = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number().int().positive(),
    }),
  ),
  email: z.string().email().optional(),
  discountCode: z.string().optional(),
});

router.post("/checkout", async (req, res): Promise<void> => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid checkout request" });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(503).json({
      error:
        "Checkout is not yet configured. Please contact us directly at hello@bougiebams.com to place an order.",
    });
    return;
  }

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey);

    const lineItems = parsed.data.items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: parsed.data.email,
      success_url: `${req.headers["x-forwarded-proto"] ?? "https"}://${req.headers["x-forwarded-host"] ?? req.headers.host}/?checkout=success`,
      cancel_url: `${req.headers["x-forwarded-proto"] ?? "https"}://${req.headers["x-forwarded-host"] ?? req.headers.host}/?checkout=cancelled`,
      ...(parsed.data.discountCode
        ? {
            discounts: [
              {
                coupon: parsed.data.discountCode,
              },
            ],
          }
        : {}),
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err);
    res.status(500).json({ error: "Could not create checkout session" });
  }
});

export default router;
