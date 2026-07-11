import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarDays, ArrowRight, ShoppingBag } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import type { ApiEvent } from "@/data/events";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

// Landing page for Meta (Facebook/Instagram) shop checkout. Meta sends
// shoppers here with their cart as ?products=<contentId>:<qty>,... using the
// catalog feed's content ids (product-<id> / event-<id>). Products are added
// to the site cart and the cart sheet opens for Square checkout; event
// tickets can't go in the cart, so those route to their registration pages.
export default function FacebookCheckout() {
  const { products, loading } = useProducts();
  const { addItem, setIsOpen } = useCart();
  const [, setLocation] = useLocation();
  const processed = useRef(false);
  const [pendingEvents, setPendingEvents] = useState<number[]>([]);
  const [addedCount, setAddedCount] = useState(0);

  const { data: eventsData } = useQuery<{ events: ApiEvent[] }>({
    queryKey: ["events-all"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/events`);
      if (!res.ok) return { events: [] };
      return res.json();
    },
    enabled: pendingEvents.length > 0,
  });

  useEffect(() => {
    if (processed.current || loading) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const raw = params.get("products") ?? "";
    const entries = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((entry) => {
        const [id, qty] = entry.split(":");
        return { id, qty: Math.max(1, parseInt(qty ?? "1", 10) || 1) };
      });

    const events: number[] = [];
    let added = 0;
    for (const { id, qty } of entries) {
      if (id.startsWith("event-")) {
        const n = parseInt(id.slice("event-".length), 10);
        if (!Number.isNaN(n)) events.push(n);
        continue;
      }
      const productId = id.startsWith("product-") ? id.slice("product-".length) : id;
      const product = products.find((p) => p.id === productId);
      if (product) {
        addItem(product, qty);
        added += 1;
      }
    }

    // Single event and nothing else: go straight to its registration page.
    if (events.length === 1 && added === 0) {
      setLocation(`/events/${events[0]}`);
      return;
    }
    // Products only (or nothing recognized): open the cart over the shop.
    if (events.length === 0) {
      if (added > 0) setIsOpen(true);
      setLocation("/shop");
      return;
    }
    // Mixed cart or multiple events: show the interstitial below.
    if (added > 0) setIsOpen(true);
    setAddedCount(added);
    setPendingEvents(events);
  }, [loading, products, addItem, setIsOpen, setLocation]);

  if (pendingEvents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="font-serif text-lg">Preparing your cart…</p>
      </div>
    );
  }

  const eventById = new Map((eventsData?.events ?? []).map((e) => [e.id, e]));

  return (
    <div className="min-h-screen pt-40 pb-24 bg-background">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        {addedCount > 0 && (
          <div className="mb-10 flex items-center justify-center gap-2 text-muted-foreground">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span>
              {addedCount} item{addedCount !== 1 ? "s" : ""} added to your cart — check out whenever you're ready.
            </span>
          </div>
        )}
        <h1 className="font-serif text-4xl mb-4">Reserve your event spot{pendingEvents.length !== 1 ? "s" : ""}</h1>
        <p className="text-muted-foreground mb-10">
          Event tickets are registered per event so we can save your seat. Tap an event below to complete your registration.
        </p>
        <div className="space-y-4">
          {pendingEvents.map((id) => {
            const evt = eventById.get(id);
            return (
              <Link key={id} href={`/events/${id}`} className="block">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-6 text-left hover:border-primary/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <CalendarDays className="w-6 h-6 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-serif text-lg text-foreground truncate">{evt?.title ?? `Event #${id}`}</div>
                      {evt && <div className="text-sm text-muted-foreground truncate">{evt.date} · {evt.location}</div>}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
        <Button asChild variant="outline" className="rounded-full mt-10">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
