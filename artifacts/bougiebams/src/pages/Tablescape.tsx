import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import {
  getVisitorId,
  useTablescapeConfig,
  useTablescapeProducts,
  type TablescapeOption,
} from "@/hooks/useTablescape";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ShoppingBag, Sparkles, RotateCcw, Download, Trash2 } from "lucide-react";
import { images } from "@/data/images";

const lifestyle = images.mahjongLifestyle;
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// A compose runs ~40 seconds. Narrating the wait keeps it from reading as a
// hang; the copy advances on its own timer, independent of the request.
const WAIT_MESSAGES = [
  "Setting your table…",
  "Rolling out the mat…",
  "Arranging the tiles…",
  "Styling the finishing touches…",
  "Almost ready…",
];

interface GenerateResult {
  id: string;
  imageUrl: string;
  remaining: number;
}

export default function Tablescape() {
  const config = useTablescapeConfig();
  const enabled = config?.enabled;
  const { data, isLoading, isError } = useTablescapeProducts(enabled === true);
  const { products: catalog } = useProducts();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { isAuthenticated, accessToken } = useSupabaseAuth();

  const [selected, setSelected] = useState<Record<string, TablescapeOption>>({});
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [waitStep, setWaitStep] = useState(0);
  const [error, setError] = useState<{ message: string; requiresSignIn?: boolean } | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const groups = data?.slots ?? [];
  const requiredSlots = useMemo(() => groups.filter((g) => g.required).map((g) => g.slot), [groups]);
  const missing = requiredSlots.filter((s) => !selected[s]);
  const chosen = groups.filter((g) => selected[g.slot]);
  const total = chosen.reduce((sum, g) => sum + selected[g.slot].price, 0);

  useEffect(() => {
    if (!generating) {
      setWaitStep(0);
      return;
    }
    const timer = setInterval(() => {
      setWaitStep((s) => Math.min(s + 1, WAIT_MESSAGES.length - 1));
    }, 8000);
    return () => clearInterval(timer);
  }, [generating]);

  const toggle = (slot: string, option: TablescapeOption) => {
    setSelected((current) => {
      const next = { ...current };
      if (next[slot]?.id === option.id) delete next[slot];
      else next[slot] = option;
      return next;
    });
    // The previous image no longer matches the selection.
    setResult(null);
    setError(null);
  };

  const generate = async () => {
    if (missing.length > 0 || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const selections = Object.fromEntries(
        Object.entries(selected).map(([slot, option]) => [slot, option.id]),
      );
      const res = await fetch(`${API_BASE}/api/tablescape/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ selections, visitorId: getVisitorId() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({
          message: body.error ?? "We couldn't build your tablescape. Please try again.",
          requiresSignIn: body.requiresSignIn === true,
        });
        return;
      }
      setResult(body as GenerateResult);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      setError({ message: "We couldn't reach the studio. Please check your connection and try again." });
    } finally {
      setGenerating(false);
    }
  };

  const addAllToCart = () => {
    const items = chosen
      .map((g) => catalog.find((p) => p.id === selected[g.slot].id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (items.length === 0) return;
    items.forEach((p) => addItem(p, 1));
    toast({
      title: "Your table is in the cart",
      description: `${items.length} item${items.length > 1 ? "s" : ""} added.`,
    });
  };

  const saveImage = async () => {
    if (!result) return;
    try {
      const res = await fetch(result.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-bougiebams-tablescape.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Couldn't save the image", description: "Try pressing and holding the image instead." });
    }
  };

  if (enabled === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 text-center px-6">
        <span className="inline-flex items-center gap-2 text-primary font-semibold tracking-[0.2em] uppercase text-xs mb-5">
          <Sparkles className="w-4 h-4" /> Coming Soon
        </span>
        <h1 className="font-serif text-4xl md:text-5xl mb-4">Design Your Table is on its way</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          We're putting the finishing touches on our tablescape studio. In the meantime, explore the
          collection in the shop.
        </p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/shop">Browse the Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-32 min-h-screen bg-background">
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground pt-40 pb-20">
        <div className="absolute inset-0 opacity-20">
          <img src={lifestyle} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/80 to-secondary/40" />
        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center max-w-3xl">
          <span className="inline-flex items-center gap-2 text-primary font-semibold tracking-[0.2em] uppercase text-xs mb-5">
            <Sparkles className="w-4 h-4" /> See It Before You Buy It
          </span>
          <h1 className="font-serif text-5xl md:text-6xl mb-6 text-white">Design Your Table</h1>
          <p className="font-serif text-lg md:text-xl text-secondary-foreground/70">
            Choose your mat, your tiles, and the pieces that finish the look — then watch your whole
            table come together in one picture.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-8 mt-12 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : isError || groups.length === 0 ? (
          <div className="text-center py-32">
            <p className="font-serif text-2xl mb-2">We couldn't load the collection</p>
            <p className="text-muted-foreground">Please refresh the page to try again.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-16">
              {groups.map((group) => (
                <section key={group.slot} data-testid={`tablescape-slot-${group.slot}`}>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h2 className="font-serif text-2xl md:text-3xl">{group.label}</h2>
                      <span
                        className={`text-[11px] tracking-[0.18em] uppercase ${
                          group.required ? "text-primary font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {group.required ? "Required" : "Optional"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {group.products.map((option) => {
                      const isSelected = selected[group.slot]?.id === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => toggle(group.slot, option)}
                          aria-pressed={isSelected}
                          data-testid={`tablescape-option-${option.id}`}
                          className={`relative text-left bg-card border rounded-md overflow-hidden transition-all duration-300 ${
                            isSelected
                              ? "border-primary ring-2 ring-primary shadow-md"
                              : "border-border hover:border-foreground/30 hover:shadow-sm"
                          }`}
                        >
                          <div className="relative aspect-square bg-muted">
                            {option.imageUrl && (
                              <img
                                src={`${option.imageUrl}?w=600`}
                                alt={option.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div
                              className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground scale-100"
                                  : "bg-background/80 text-transparent scale-90"
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="font-serif text-base leading-tight line-clamp-2">{option.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">${option.price}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <aside className="lg:sticky lg:top-32 h-fit">
              <div className="border border-border rounded-md bg-card p-6">
                <h3 className="font-serif text-2xl mb-1">Your Table</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {chosen.length === 0
                    ? "Start with a mat and a set of tiles."
                    : `${chosen.length} piece${chosen.length > 1 ? "s" : ""} selected`}
                </p>

                <div className="space-y-4 mb-6">
                  {chosen.map((group) => {
                    const option = selected[group.slot];
                    return (
                      <div key={group.slot} className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                          {option.imageUrl && (
                            <img src={`${option.imageUrl}?w=120`} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs tracking-widest uppercase text-muted-foreground">{group.label}</p>
                          <p className="font-serif leading-tight truncate">{option.name}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">${option.price}</span>
                        <button
                          onClick={() => toggle(group.slot, option)}
                          className="p-2 -m-1 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={`Remove ${option.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {chosen.length > 0 && (
                  <div className="border-t border-border pt-4 flex justify-between items-baseline font-serif text-xl mb-6">
                    <span>Total</span>
                    <span>${total}</span>
                  </div>
                )}

                <Button
                  className="w-full h-12 text-base"
                  disabled={missing.length > 0 || generating}
                  onClick={generate}
                  data-testid="button-generate-tablescape"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Setting your table…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Show me my table
                    </>
                  )}
                </Button>

                {missing.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Choose a {missing.includes("mat") ? "mat" : ""}
                    {missing.length === 2 ? " and tiles" : missing.includes("tiles") ? "tile set" : ""} to
                    continue.
                  </p>
                )}

                {error && (
                  <div className="mt-4 text-sm text-center">
                    <p className="text-destructive">{error.message}</p>
                    {error.requiresSignIn && (
                      <Button asChild variant="outline" className="mt-3 w-full h-11">
                        <Link href="/login">Sign in to keep designing</Link>
                      </Button>
                    )}
                  </div>
                )}

                {result && (
                  <>
                    <Button variant="outline" className="w-full h-12 mt-3" onClick={addAllToCart}>
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      Add these to cart
                    </Button>
                    {!isAuthenticated && result.remaining <= 1 && (
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        {result.remaining === 0
                          ? "That was your last free tablescape today."
                          : "One free tablescape left today."}{" "}
                        <Link href="/login" className="text-primary hover:underline">
                          Sign in
                        </Link>{" "}
                        for more.
                      </p>
                    )}
                  </>
                )}
              </div>
            </aside>
          </div>
        )}

        {(generating || result) && (
          <div ref={resultRef} className="mt-16 scroll-mt-28">
            <div className="max-w-4xl mx-auto">
              {generating ? (
                <div className="aspect-[3/2] rounded-md bg-muted/60 border border-border flex flex-col items-center justify-center gap-4 px-6 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="font-serif text-2xl">{WAIT_MESSAGES[waitStep]}</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Styling your table takes about a minute. Feel free to keep browsing — we'll have it
                    ready when you come back.
                  </p>
                </div>
              ) : result ? (
                <figure>
                  <img
                    src={result.imageUrl}
                    alt="Your mahjong tablescape, styled with the pieces you chose"
                    className="w-full rounded-md border border-border"
                  />
                  <figcaption className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-xs text-muted-foreground max-w-lg">
                      AI visualization — a styled preview of the pieces you selected. Colors, patterns and
                      placement are approximate; see each product page for the real photos.
                    </p>
                    <div className="flex gap-3 shrink-0">
                      <Button variant="outline" className="h-11" onClick={saveImage}>
                        <Download className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" className="h-11" onClick={generate} disabled={generating}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try again
                      </Button>
                    </div>
                  </figcaption>
                </figure>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
