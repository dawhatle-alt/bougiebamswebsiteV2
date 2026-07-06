import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Loader2, ShoppingBag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

interface LineItem {
  name: string;
  quantity: string;
  amount: number;
}

interface OrderSummary {
  orderId: string;
  state: string;
  paid: boolean;
  currency: string;
  total: number;
  totalTax: number;
  createdAt: string | null;
  lineItems: LineItem[];
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CheckoutConfirmation() {
  const { clearCart } = useCart();

  const params = new URLSearchParams(window.location.search);
  // Square appends the order/checkout ids to the redirect (support snake_case too).
  const orderId = params.get("orderId") ?? params.get("order_id") ?? "";
  const checkoutId = params.get("checkoutId") ?? params.get("checkout_id") ?? "";

  const [data, setData] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Arriving here means the buyer completed Square checkout, so empty the cart —
  // but only when we actually have an order reference, so a stray visit to this
  // URL doesn't wipe someone's in-progress cart.
  useEffect(() => {
    if (orderId || checkoutId) clearCart();
  }, [orderId, checkoutId, clearCart]);

  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const run = async () => {
      if (!orderId && !checkoutId) {
        setLoading(false);
        return;
      }
      try {
        const qs = new URLSearchParams();
        if (orderId) qs.set("orderId", orderId);
        if (checkoutId) qs.set("checkoutId", checkoutId);
        const res = await fetch(`${base}/api/checkout/summary?${qs.toString()}`);
        if (!res.ok) throw new Error("failed");
        setData((await res.json()) as OrderSummary);
      } catch {
        // Payment still succeeded; we just couldn't load the itemized recap.
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [orderId, checkoutId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const itemsSubtotal = data ? Math.max(0, data.total - data.totalTax) : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 max-w-2xl pt-12">
        <div className="bg-card rounded-3xl shadow-lg border border-border overflow-hidden">
          <div className="bg-primary/5 border-b border-border px-8 py-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-serif text-3xl font-medium mb-2">Thank you for your order!</h1>
            <p className="text-muted-foreground text-sm">
              Your payment was successful and a receipt has been emailed to you.
            </p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {data ? (
              <>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Order Summary
                  </h2>
                  <div className="space-y-3">
                    {data.lineItems.map((li, i) => (
                      <div key={i} className="flex justify-between items-start text-sm gap-4">
                        <span className="flex items-start gap-2">
                          <ShoppingBag className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>
                            {li.name}
                            <span className="text-muted-foreground"> × {li.quantity}</span>
                          </span>
                        </span>
                        <span className="font-medium whitespace-nowrap">{money(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{money(itemsSubtotal)}</span>
                  </div>
                  {data.totalTax > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax</span>
                      <span>{money(data.totalTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-medium">Total paid</span>
                    <span className="font-serif text-xl font-medium">{money(data.total)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Order reference: <span className="font-mono">{data.orderId}</span>
                </p>
              </>
            ) : (
              <div className="text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-8 h-8" />
                <p>
                  Your payment went through. We couldn't load the itemized recap here, but your
                  emailed receipt has the full details.
                </p>
              </div>
            )}
          </div>

          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
            <Link href="/shop" className="flex-1">
              <Button className="w-full rounded-xl h-12">Continue Shopping</Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl h-12">Back to Home</Button>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Questions about your order? Email us at{" "}
          <a
            href="mailto:hello@bougiebams.com"
            className="underline hover:text-foreground transition-colors"
          >
            hello@bougiebams.com
          </a>
        </p>
      </div>
    </div>
  );
}
