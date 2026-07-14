import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FloatingProductCard } from "@/components/FloatingProductCard";
import { FAVORITES, CATEGORIES, CATEGORY_DESCRIPTIONS, type FavoriteCategory, type FavoriteProduct } from "@/data/favorites";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

interface CustomProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  affiliateUrl: string;
  image: string | null;
}

function useFavoriteImages(): Record<string, string> {
  const { data } = useQuery<{ images: Record<string, string> }>({
    queryKey: ["favorites-images"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/favorites/images`);
      if (!res.ok) return { images: {} };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  return data?.images ?? {};
}

function useCustomProducts(): CustomProduct[] {
  const { data } = useQuery<{ products: CustomProduct[] }>({
    queryKey: ["favorites-custom-products"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/favorites/custom-products`);
      if (!res.ok) return { products: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  return data?.products ?? [];
}

export default function Favorites() {
  const [activeCategory, setActiveCategory] = useState<FavoriteCategory | "All">("All");
  const [search, setSearch] = useState("");
  const imageMap = useFavoriteImages();
  const customProducts = useCustomProducts();

  const allProducts: FavoriteProduct[] = useMemo(() => {
    const statics = FAVORITES.map((p) =>
      imageMap[p.id] ? { ...p, image: imageMap[p.id] } : p
    );
    const customs: FavoriteProduct[] = customProducts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category as FavoriteCategory,
      description: p.description,
      affiliateUrl: p.affiliateUrl,
      image: p.image ?? `/images/placeholder.jpg`,
    }));
    return [...statics, ...customs];
  }, [imageMap, customProducts]);

  const visibleCategories = useMemo(() => {
    if (activeCategory !== "All") return [activeCategory];
    const extraCats = customProducts
      .map((p) => p.category as FavoriteCategory)
      .filter((c) => !CATEGORIES.includes(c));
    const unique = [...new Set(extraCats)];
    return [...CATEGORIES, ...unique];
  }, [activeCategory, customProducts]);

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      const matchCat = activeCategory === "All" || p.category === activeCategory;
      if (!matchCat) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, search, allProducts]);

  return (
    <div className="w-full">
      <section className="relative text-background py-20 px-4 overflow-hidden" style={{ minHeight: "360px" }}>
        <img
          src={`${import.meta.env.BASE_URL}bougie-zebra-banner.png`}
          alt="BougieBams Favorites banner"
          className="absolute inset-0 w-full h-full object-cover object-[50%_center] md:object-[70%_center]"
        />
        <div className="absolute inset-0 bg-foreground/40" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="max-w-xl">
            <h1 className="font-serif text-5xl md:text-6xl font-medium mb-4">BougieBams Favorites</h1>
            <p className="text-lg md:text-xl text-white/90 font-light">
              Curated Mahjong accessories, winner brags, and table essentials we love.
            </p>
            <a
              href="https://www.amazon.com/shop/bougiebams"
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #b08a1e 0%, #C9A227 50%, #ddb93a 100%)" }}
            >
              <ShoppingBag className="w-4 h-4" />
              Shop Our Full Amazon Storefront
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </section>

      <section className="sticky top-[72px] md:top-[104px] z-30 bg-background border-b border-border shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <button
                onClick={() => setActiveCategory("All")}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors border ${
                  activeCategory === "All"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                All ({allProducts.length})
              </button>
              {visibleCategories.map((cat) => {
                const count = allProducts.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors border ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-full bg-card border-border"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-background min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-7xl space-y-16">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-serif text-2xl text-muted-foreground">No products match your search.</p>
              <button
                onClick={() => { setSearch(""); setActiveCategory("All"); }}
                className="mt-6 px-6 py-2 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            visibleCategories.map((cat) => {
              const products = filtered.filter((p) => p.category === cat);
              if (products.length === 0) return null;
              const desc = CATEGORY_DESCRIPTIONS[cat as FavoriteCategory];
              return (
                <div key={cat}>
                  <div className="mb-6">
                    <h2 className="font-serif text-3xl font-medium text-foreground mb-1">{cat}</h2>
                    {desc && <p className="text-muted-foreground text-sm">{desc}</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                      <FloatingProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="bg-muted/50 border-t border-border py-6">
        <div className="container mx-auto px-4 max-w-7xl text-center text-sm text-muted-foreground">
          As an Amazon Associate, BougieBams earns from qualifying purchases.
        </div>
      </div>
    </div>
  );
}
