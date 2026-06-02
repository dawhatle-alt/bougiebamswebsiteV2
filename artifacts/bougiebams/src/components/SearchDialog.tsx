import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import { blogPosts } from "@/data/blog";

const POPULAR = ["Complete Sets", "Gift Sets", "Tiles & Accessories", "Apparel & Lifestyle"];

export default function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const { products, loading } = useProducts();
  const q = query.trim().toLowerCase();

  const productResults = useMemo(() => {
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [q, products]);

  const postResults = useMemo(() => {
    if (!q) return [];
    return blogPosts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [q]);

  const hasResults = productResults.length > 0 || postResults.length > 0;

  const close = () => {
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden top-[12%] translate-y-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 px-5 border-b border-border">
          <SearchIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products and the journal…"
            className="flex-1 h-14 bg-transparent text-lg font-serif placeholder:text-muted-foreground/70 focus:outline-none"
            data-testid="input-search"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!q ? (
            <div className="p-6">
              <p className="text-xs tracking-widest uppercase text-muted-foreground mb-4">
                Popular Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((term) => (
                  <Link
                    key={term}
                    href={`/shop?category=${encodeURIComponent(term)}`}
                    onClick={close}
                    className="px-4 py-2 text-sm border border-border rounded-full hover:border-foreground hover:text-foreground text-muted-foreground transition-colors"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !hasResults ? (
            <div className="py-16 text-center px-6">
              <p className="font-serif text-xl mb-2">No results for "{query}"</p>
              <p className="text-sm text-muted-foreground">
                Try a different term, or browse the full collection.
              </p>
            </div>
          ) : (
            <div className="py-2">
              {productResults.length > 0 && (
                <div className="px-3 py-2">
                  <p className="text-xs tracking-widest uppercase text-muted-foreground px-3 py-2">
                    Products
                  </p>
                  {productResults.map((p) => (
                    <Link
                      key={p.id}
                      href={`/shop/${p.id}`}
                      onClick={close}
                      className="flex items-center gap-4 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                      data-testid={`search-result-${p.id}`}
                    >
                      <div className="w-12 h-12 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif truncate">{p.name}</p>
                        <p className="text-sm text-muted-foreground">{p.category}</p>
                      </div>
                      <span className="text-sm text-muted-foreground flex-shrink-0">${p.price}</span>
                    </Link>
                  ))}
                </div>
              )}

              {postResults.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <p className="text-xs tracking-widest uppercase text-muted-foreground px-3 py-2">
                    From the Journal
                  </p>
                  {postResults.map((p) => (
                    <Link
                      key={p.id}
                      href="/blog"
                      onClick={close}
                      className="flex items-center gap-4 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="w-12 h-12 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif truncate">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{p.category}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
