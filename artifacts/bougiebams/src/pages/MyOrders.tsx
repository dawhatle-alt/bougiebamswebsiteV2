import { useAuth } from "@workspace/replit-auth-web";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { LogIn, Receipt, CalendarDays, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface OrderItem {
  name: string;
  quantity: string;
  amountCents: number;
}

interface OrderRecord {
  id: string;
  kind: string;
  totalCents: number;
  discountCents: number;
  discountCode: string | null;
  currency: string;
  state: string;
  items: OrderItem[];
  createdAt: string;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function orderDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function MyOrders() {
  const { isLoading: adminLoading, isAuthenticated } = useAuth();
  const { isAuthenticated: shopperAuthenticated, isLoading: shopperLoading, accessToken } = useSupabaseAuth();

  const anyAuthenticated = isAuthenticated || shopperAuthenticated;
  const anyLoading = adminLoading || shopperLoading;

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!anyAuthenticated) return;
    setFetching(true);
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const headers: Record<string, string> = {};
    if (shopperAuthenticated && accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    fetch(`${base}/api/account/orders`, { headers, credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ orders: OrderRecord[] }>;
      })
      .then((data) => {
        setOrders(data.orders ?? []);
        setFetching(false);
      })
      .catch((err) => {
        setError(err.message);
        setFetching(false);
      });
  }, [anyAuthenticated, shopperAuthenticated, accessToken]);

  if (anyLoading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!anyAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-6">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold">My Orders</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Sign in to view your order history.
        </p>
        <Link href="/login">
          <Button size="lg" className="rounded-full px-8">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold">My Orders</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Purchases and event payments made with your account's email address.
        </p>
      </div>

      {fetching && <p className="text-muted-foreground text-center py-12">Loading your orders…</p>}
      {error && <p className="text-destructive text-center py-12">Could not load orders: {error}</p>}

      {!fetching && !error && orders.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <Receipt className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">No orders yet.</p>
          <Link href="/shop">
            <Button className="rounded-full px-8">Browse the Shop</Button>
          </Link>
        </div>
      )}

      {!fetching && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-border rounded-xl bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div className="flex items-center gap-2.5">
                  {order.kind === "event" ? (
                    <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <div>
                    <p className="font-serif font-semibold leading-tight">
                      {order.kind === "event" ? "Event Payment" : "Shop Order"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{orderDate(order.createdAt)}</p>
                  </div>
                </div>
                <Badge variant={order.state === "COMPLETED" ? "default" : "secondary"} className="shrink-0">
                  {order.state === "COMPLETED" ? "Paid" : order.state.toLowerCase()}
                </Badge>
              </div>

              {order.items.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                  {order.items.map((item, j) => (
                    <li key={j} className="flex justify-between gap-4">
                      <span className="truncate">
                        {item.quantity !== "1" ? `${item.quantity} × ` : ""}{item.name}
                      </span>
                      <span className="shrink-0">{money(item.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-border pt-3 space-y-1">
                {order.discountCents > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount{order.discountCode ? ` (${order.discountCode})` : ""}</span>
                    <span>−{money(order.discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{money(order.totalCents)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
