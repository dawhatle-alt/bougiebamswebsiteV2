import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { useProducts } from "@/hooks/useProducts";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Heart, Minus, Plus, Star, Loader2, ZoomIn, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Full-resolution variant for the zoom lightbox (gallery URLs carry ?w=1200).
const zoomSrc = (src: string) => src.replace("?w=1200", "?w=1600");

// The three detail-page tabs. Content is per-product, managed from the admin
// panel; a tab with no content (or toggled off) is hidden.
const TAB_DEFS = [
  { key: "details" as const, label: "Product Details" },
  { key: "care" as const, label: "Care Instructions" },
  { key: "shipping" as const, label: "Shipping & Returns" },
];

export default function ProductDetail() {
  const { id } = useParams();
  const { products, loading, error } = useProducts();
  const product = products.find(p => p.id === id);
  usePageTitle(product?.name, product?.description?.slice(0, 160));
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const { addItem } = useCart();

  // Lightbox keyboard support: Esc closes, arrows move between photos.
  const imgCount = product ? product.images.filter(Boolean).length : 0;
  useEffect(() => {
    if (!zoomOpen || imgCount === 0) return;
    const wrap = (i: number) => ((i % imgCount) + imgCount) % imgCount;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomOpen(false);
      if (e.key === "ArrowRight") setSelectedImage((i) => wrap(Math.min(i, imgCount - 1) + 1));
      if (e.key === "ArrowLeft") setSelectedImage((i) => wrap(Math.min(i, imgCount - 1) - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomOpen, imgCount]);
  const { toggle, isSaved } = useWishlist();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="font-serif text-lg">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 text-center px-6">
        <h1 className="font-serif text-4xl mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-8 max-w-md">{error} Please refresh to try again.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-none">
          Refresh
        </Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
        <h1 className="font-serif text-4xl mb-4">Product Not Found</h1>
        <Button asChild variant="outline" className="rounded-none">
          <Link href="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const galleryImages = product.images.filter(Boolean);
  const activeImage = Math.max(0, Math.min(selectedImage, galleryImages.length - 1));

  const visibleTabs = TAB_DEFS.map((def) => {
    const tab = product.tabs?.[def.key];
    return {
      ...def,
      content: (tab?.content ?? "").trim(),
      enabled: tab?.enabled ?? true,
    };
  }).filter((t) => t.enabled && t.content.length > 0);

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8">

        <div className="flex items-center text-sm text-muted-foreground mb-12 font-sans tracking-wide">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-foreground transition-colors">
            {product.category}
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 mb-24">
          <div className="w-full lg:w-3/5 flex flex-col gap-4">
            <motion.div
              key={activeImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="aspect-square md:aspect-[4/3] overflow-hidden bg-muted rounded-sm relative"
            >
              {product.isNew && (
                <div className="absolute top-6 left-6 z-10 bg-primary text-primary-foreground text-xs font-semibold tracking-widest uppercase px-4 py-1">
                  New Arrival
                </div>
              )}
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                className="group/zoom block w-full h-full cursor-zoom-in"
                aria-label="Zoom image"
              >
                <img
                  src={galleryImages[activeImage]}
                  alt={`${product.name} — view ${activeImage + 1}`}
                  className="w-full h-full object-contain"
                />
                <span className="absolute bottom-4 right-4 bg-background/85 backdrop-blur-sm rounded-full p-2.5 shadow-sm opacity-70 group-hover/zoom:opacity-100 transition-opacity">
                  <ZoomIn className="w-4 h-4 text-foreground" />
                </span>
              </button>
            </motion.div>

            {zoomOpen && (
              <div
                className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
                onClick={() => setZoomOpen(false)}
              >
                <img
                  src={zoomSrc(galleryImages[activeImage])}
                  alt={`${product.name} — enlarged view`}
                  className="max-w-[95vw] max-h-[92dvh] object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={() => setZoomOpen(false)}
                  aria-label="Close zoom"
                  className="absolute top-3 right-3 p-3 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-7 h-7" />
                </button>
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={(e) => { e.stopPropagation(); setSelectedImage(activeImage === 0 ? galleryImages.length - 1 : activeImage - 1); }}
                      className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={(e) => { e.stopPropagation(); setSelectedImage(activeImage === galleryImages.length - 1 ? 0 : activeImage + 1); }}
                      className="absolute right-1 md:right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm tracking-widest">
                      {activeImage + 1} / {galleryImages.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {galleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-sm overflow-hidden border-2 transition-all duration-200 ${
                      activeImage === i
                        ? "border-primary opacity-100"
                        : "border-transparent opacity-60 hover:opacity-90"
                    }`}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-full lg:w-2/5 flex flex-col pt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h1 className="font-serif text-4xl md:text-5xl mb-4">{product.name}</h1>

              <div className="flex items-center gap-4 mb-6 flex-wrap">
                <span className="text-2xl">${product.price}</span>
                {product.shippingIncluded && (
                  <span className="text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary px-3 py-1 rounded-full">
                    Shipping included
                  </span>
                )}
                <div className="flex items-center text-primary">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-current' : ''}`} />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
                </div>
              </div>

              <p className="font-serif text-lg leading-relaxed text-muted-foreground mb-8">
                {product.description}
              </p>

              <div className="space-y-6 mb-10">
                <div>
                  <h4 className="text-sm font-semibold tracking-widest uppercase mb-3">Quantity</h4>
                  <div className="flex items-center w-32 border border-border">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="flex-1 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  className="flex-1 h-14 text-lg bg-foreground text-background hover:bg-primary rounded-none"
                  disabled={!product.inStock}
                  onClick={() => addItem(product, quantity)}
                >
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
                </Button>
                <Button
                  variant="outline"
                  className="h-14 w-14 p-0 rounded-none border-border hover:bg-muted flex-shrink-0"
                  aria-pressed={isSaved(product.id)}
                  aria-label={isSaved(product.id) ? "Remove from wishlist" : "Save to wishlist"}
                  data-testid="button-wishlist-toggle"
                  onClick={() => {
                    const wasSaved = isSaved(product.id);
                    toggle(product);
                    toast({
                      title: wasSaved ? "Removed from wishlist" : "Saved to wishlist",
                      description: product.name,
                    });
                  }}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isSaved(product.id) ? "fill-primary text-primary" : "text-muted-foreground"
                    }`}
                  />
                </Button>
              </div>

              <div className="mt-8 space-y-4 text-sm text-muted-foreground">
                <div className="flex justify-between py-3 border-b border-border">
                  <span>Availability</span>
                  <span className={product.inStock ? "text-primary font-medium" : "text-destructive"}>
                    {product.inStock ? "In Stock — Ready to Ship" : "Sold Out"}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {visibleTabs.length > 0 && (
          <div className="max-w-4xl mx-auto mb-24">
            <Tabs key={product.id} defaultValue={visibleTabs[0].key} className="w-full">
              <TabsList className="w-full border-b border-border rounded-none h-auto p-0 bg-transparent justify-start gap-8">
                {visibleTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-4 text-lg font-serif"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {visibleTabs.map((tab) => (
                <TabsContent
                  key={tab.key}
                  value={tab.key}
                  className="py-8 font-serif text-lg leading-relaxed text-muted-foreground whitespace-pre-line"
                >
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {relatedProducts.length > 0 && (
          <div>
            <h3 className="font-serif text-3xl mb-10 text-center">You May Also Like</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map((p) => (
                <Link key={p.id} href={`/shop/${p.id}`} className="group">
                  <div className="aspect-square bg-muted mb-4 overflow-hidden">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <h4 className="font-serif text-lg group-hover:text-primary transition-colors">{p.name}</h4>
                  <p className="text-muted-foreground">${p.price}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
