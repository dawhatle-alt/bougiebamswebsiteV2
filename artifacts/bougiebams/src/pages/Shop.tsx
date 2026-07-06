import { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { ShoppingBag, Eye, SlidersHorizontal, ChevronDown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SHOP_CATEGORIES } from "@/data/categories";

export default function Shop() {
  const [location] = useLocation();
  const search = useSearch();
  const categoryParam = new URLSearchParams(search).get("category");

  const [activeCategory, setActiveCategory] = useState(categoryParam || "All");
  const [sortBy, setSortBy] = useState("featured");
  const [quickViewProduct, setQuickViewProduct] = useState<string | null>(null);
  const { addItem } = useCart();
  const { products, loading, error } = useProducts();

  const categories = useMemo(() => {
    const present = Array.from(new Set(products.map((p) => p.category)));
    const ordered = SHOP_CATEGORIES.map((c) => c.name).filter((n) => present.includes(n));
    const extras = present.filter((n) => !ordered.includes(n));
    return ["All", ...ordered, ...extras];
  }, [products]);

  useEffect(() => {
    setActiveCategory(categoryParam ?? "All");
  }, [categoryParam]);

  const filteredProducts = useMemo(() => {
    let result = products;
    
    if (activeCategory !== "All") {
      result = result.filter(p => p.category === activeCategory);
    }
    
    if (sortBy === "price-low") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      result = [...result].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }
    
    return result;
  }, [products, activeCategory, sortBy]);

  const selectedProduct = products.find(p => p.id === quickViewProduct);

  return (
    <div className="pt-28 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-8 pt-2 pb-6 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-primary font-semibold tracking-widest uppercase text-xs mb-2 block">Premium Mahjong</span>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-4xl md:text-5xl">The Collection</h1>
              </div>
            </div>
            <p className="text-muted-foreground font-serif text-base max-w-sm md:text-right">
              Curated sets, accessories, and lifestyle pieces.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Sort By:</span>
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-transparent pr-8 py-1 font-sans text-sm tracking-wide uppercase focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-serif text-lg">Loading the collection…</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-24">
            <h3 className="font-serif text-2xl mb-4">We couldn't load the collection</h3>
            <p className="text-muted-foreground mb-8">{error} Please refresh to try again.</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="rounded-none">
              Refresh
            </Button>
          </div>
        )}

        {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
          {filteredProducts.map((product, i) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group flex flex-col"
            >
              <BorderRotate
                animationMode="auto-rotate"
                animationSpeed={4}
                backgroundColor="hsl(var(--card))"
                borderRadius={12}
                borderWidth={3}
                className="p-2 h-full flex flex-col"
              >
              <div className="relative aspect-square mb-4 overflow-hidden rounded-md bg-muted/30">
                {product.isNew && (
                  <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground text-xs font-semibold tracking-widest uppercase px-3 py-1">
                    New
                  </div>
                )}
                {!product.inStock && (
                  <div className="absolute top-4 left-4 z-10 bg-secondary text-secondary-foreground text-xs font-semibold tracking-widest uppercase px-3 py-1">
                    Sold Out
                  </div>
                )}
                <Link href={`/shop/${product.id}`} className="absolute inset-0 z-0">
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </Link>
                
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex gap-2 z-20">
                  <Button 
                    className="flex-1 bg-background/95 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground rounded-none"
                    onClick={(e) => {
                      e.preventDefault();
                      setQuickViewProduct(product.id);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" /> Quick View
                  </Button>
                  <Button 
                    className="flex-1 bg-foreground text-background hover:bg-primary rounded-none disabled:opacity-50"
                    disabled={!product.inStock}
                    onClick={(e) => {
                      e.preventDefault();
                      addItem(product);
                    }}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" /> Add
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col flex-1 px-2 pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/shop/${product.id}`} className="hover:text-primary transition-colors">
                    <h3 className="font-serif text-xl">{product.name}</h3>
                  </Link>
                  <span className="font-sans font-medium">${product.price}</span>
                </div>
                <p className="text-muted-foreground text-sm font-sans tracking-wide">{product.category}</p>
              </div>
              </BorderRotate>
            </motion.div>
          ))}
        </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-24">
            <h3 className="font-serif text-2xl mb-4">No products found</h3>
            <p className="text-muted-foreground mb-8">Try adjusting your filters to find what you're looking for.</p>
            <Button onClick={() => setActiveCategory("All")} variant="outline" className="rounded-none">
              View All Products
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!quickViewProduct} onOpenChange={(open) => !open && setQuickViewProduct(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background rounded-none border-border">
          <DialogTitle className="sr-only">Quick view for {selectedProduct?.name}</DialogTitle>
          <DialogDescription className="sr-only">Product details and add to cart options</DialogDescription>
          {selectedProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="aspect-square md:aspect-auto bg-muted">
                <img
                  src={selectedProduct.images[0]}
                  alt={selectedProduct.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <span className="text-primary text-xs font-semibold tracking-widest uppercase mb-4">
                  {selectedProduct.category}
                </span>
                <h2 className="font-serif text-4xl mb-4">{selectedProduct.name}</h2>
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <span className="text-2xl">${selectedProduct.price}</span>
                  {selectedProduct.shippingIncluded && (
                    <span className="text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary px-3 py-1 rounded-full">
                      Shipping included
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground font-serif text-lg leading-relaxed mb-8">
                  {selectedProduct.description}
                </p>
                <Button 
                  className="w-full h-14 text-lg rounded-none bg-foreground text-background hover:bg-primary"
                  disabled={!selectedProduct.inStock}
                  onClick={() => {
                    addItem(selectedProduct);
                    setQuickViewProduct(null);
                  }}
                >
                  {selectedProduct.inStock ? "Add to Cart" : "Out of Stock"}
                </Button>
                <div className="mt-6 text-center">
                  <Link 
                    href={`/shop/${selectedProduct.id}`}
                    onClick={() => setQuickViewProduct(null)}
                    className="text-sm tracking-widest uppercase font-medium underline underline-offset-4 hover:text-primary transition-colors"
                  >
                    View Full Details
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
