import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { SHOP_CATEGORIES } from "@/data/categories";
import { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ShoppingBag, Trash2, Sparkles } from "lucide-react";
import lifestyle from "@assets/images/mahjong-lifestyle.png";

export default function BuildYourSet() {
  const { products, loading, error } = useProducts();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Record<string, Product>>({});

  const grouped = useMemo(() => {
    return SHOP_CATEGORIES.map((cat) => ({
      ...cat,
      items: products.filter((p) => p.category === cat.name),
    })).filter((g) => g.items.length > 0);
  }, [products]);

  const selectedItems = Object.values(selected);
  const total = selectedItems.reduce((sum, p) => sum + p.price, 0);

  const toggle = (category: string, product: Product) => {
    setSelected((current) => {
      const next = { ...current };
      if (next[category]?.id === product.id) {
        delete next[category];
      } else {
        next[category] = product;
      }
      return next;
    });
  };

  const removeOne = (category: string) => {
    setSelected((current) => {
      const next = { ...current };
      delete next[category];
      return next;
    });
  };

  const addSetToCart = () => {
    if (selectedItems.length === 0) return;
    selectedItems.forEach((p) => addItem(p, 1));
    toast({
      title: "Your set is in the cart",
      description: `${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} added.`,
    });
  };

  return (
    <div className="pb-24 min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground pt-40 pb-20">
        <div className="absolute inset-0 opacity-20">
          <img src={lifestyle} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/80 to-secondary/40" />
        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center max-w-3xl">
          <span className="inline-flex items-center gap-2 text-primary font-semibold tracking-[0.2em] uppercase text-xs mb-5">
            <Sparkles className="w-4 h-4" /> Made Your Way
          </span>
          <h1 className="font-serif text-5xl md:text-6xl mb-6 text-white">Build Your Set</h1>
          <p className="font-serif text-lg md:text-xl text-secondary-foreground/70">
            Hand-pick the pieces that suit your style — from the perfect set to the finishing
            touches — and we'll bundle them together for game night.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-8 mt-12 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-32">
            <p className="font-serif text-2xl mb-2">We couldn't load the collection</p>
            <p className="text-muted-foreground">Please refresh the page to try again.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Steps */}
            <div className="lg:col-span-2 space-y-16">
              {grouped.map((group, gi) => (
                <section key={group.name} data-testid={`build-step-${gi + 1}`}>
                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="font-serif text-2xl text-primary">
                      {String(gi + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2 className="font-serif text-2xl md:text-3xl">{group.name}</h2>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {group.items.map((product) => {
                      const isSelected = selected[group.name]?.id === product.id;
                      const soldOut = !product.inStock;
                      return (
                        <button
                          key={product.id}
                          onClick={() => !soldOut && toggle(group.name, product)}
                          disabled={soldOut}
                          aria-pressed={isSelected}
                          data-testid={`build-option-${product.id}`}
                          className={`relative text-left bg-card border rounded-md overflow-hidden transition-all duration-300 ${
                            soldOut
                              ? "border-border opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "border-primary ring-2 ring-primary shadow-md"
                              : "border-border hover:border-foreground/30 hover:shadow-sm"
                          }`}
                        >
                          <div className="relative aspect-[4/3] bg-muted">
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            {soldOut ? (
                              <div className="absolute top-3 left-3 bg-background text-foreground text-xs font-semibold tracking-widest uppercase px-3 py-1 shadow-sm">
                                Sold Out
                              </div>
                            ) : (
                              <div
                                className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground scale-100"
                                    : "bg-background/80 text-transparent scale-90"
                                }`}
                              >
                                <Check className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <p className="font-serif text-lg leading-tight">{product.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">${product.price}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Summary */}
            <aside className="lg:sticky lg:top-32 h-fit">
              <div className="border border-border rounded-md bg-card p-6">
                <h3 className="font-serif text-2xl mb-1">Your Set</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {selectedItems.length === 0
                    ? "Start building by selecting items above."
                    : `${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} selected`}
                </p>

                <div className="space-y-4 mb-6">
                  {SHOP_CATEGORIES.filter((c) => selected[c.name]).map((c) => {
                    const product = selected[c.name];
                    return (
                      <div key={c.name} className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs tracking-widest uppercase text-muted-foreground">
                            {c.name}
                          </p>
                          <p className="font-serif leading-tight truncate">{product.name}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">${product.price}</span>
                        <button
                          onClick={() => removeOne(c.name)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border pt-4 flex justify-between items-baseline font-serif text-xl mb-1">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {total > 150
                    ? "You qualify for complimentary shipping!"
                    : "Complimentary shipping on orders over $150."}
                </p>

                <Button
                  className="w-full h-12 text-base"
                  disabled={selectedItems.length === 0}
                  onClick={addSetToCart}
                  data-testid="button-add-set"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Add Your Set to Cart
                </Button>

                <Link
                  href="/shop"
                  className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors mt-4"
                >
                  Or browse the full collection
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
