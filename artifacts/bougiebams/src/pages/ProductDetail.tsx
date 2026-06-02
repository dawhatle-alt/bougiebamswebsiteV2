import { useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { products } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { ChevronRight, Heart, Minus, Plus, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VARIANTS: Record<string, { label: string; options: string[] }[]> = {
  "Complete Sets": [
    { label: "Finish", options: ["High Gloss", "Matte", "Satin"] },
    { label: "Case Color", options: ["Ivory", "Midnight Navy", "Blush"] },
  ],
  "Tiles & Accessories": [
    { label: "Color", options: ["Blush", "Navy", "Ivory", "Sage"] },
  ],
  "Gift Sets": [
    { label: "Ribbon Color", options: ["Gold", "Navy", "Blush"] },
  ],
  "Apparel & Lifestyle": [
    { label: "Size", options: ["XS", "S", "M", "L", "XL"] },
    { label: "Color", options: ["Cream", "Navy", "Blush"] },
  ],
};

export default function ProductDetail() {
  const { id } = useParams();
  const product = products.find(p => p.id === id);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const { addItem } = useCart();

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

  const galleryImages = product.images.length > 1
    ? product.images
    : [...product.images, ...relatedProducts.slice(0, 3).map(p => p.images[0])].filter(Boolean);

  const variantOptions = VARIANTS[product.category] ?? [];

  const handleVariantSelect = (label: string, option: string) => {
    setSelectedVariants(prev => ({ ...prev, [label]: option }));
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8">

        {/* Breadcrumbs */}
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
          {/* Image Gallery */}
          <div className="w-full lg:w-3/5 flex flex-col gap-4">
            <motion.div
              key={selectedImage}
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
              <img
                src={galleryImages[selectedImage]}
                alt={`${product.name} — view ${selectedImage + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-sm overflow-hidden border-2 transition-all duration-200 ${
                      selectedImage === i
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

          {/* Details */}
          <div className="w-full lg:w-2/5 flex flex-col pt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h1 className="font-serif text-4xl md:text-5xl mb-4">{product.name}</h1>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-2xl">${product.price}</span>
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
                {/* Variant selectors */}
                {variantOptions.map(({ label, options }) => (
                  <div key={label}>
                    <div className="flex items-baseline gap-2 mb-3">
                      <h4 className="text-sm font-semibold tracking-widest uppercase">{label}</h4>
                      {selectedVariants[label] && (
                        <span className="text-sm text-muted-foreground font-serif italic">{selectedVariants[label]}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {options.map(option => (
                        <button
                          key={option}
                          onClick={() => handleVariantSelect(label, option)}
                          className={`px-4 py-2 text-sm border transition-all duration-200 rounded-sm ${
                            selectedVariants[label] === option
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Quantity */}
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
                <Button variant="outline" className="h-14 w-14 p-0 rounded-none border-border hover:bg-muted flex-shrink-0">
                  <Heart className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>

              <div className="mt-8 space-y-4 text-sm text-muted-foreground">
                <div className="flex justify-between py-3 border-b border-border">
                  <span>Availability</span>
                  <span className={product.inStock ? "text-primary font-medium" : "text-destructive"}>
                    {product.inStock ? "In Stock — Ready to Ship" : "Sold Out"}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span>Shipping</span>
                  <span>Free shipping over $150</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span>Returns</span>
                  <span>30-day easy returns</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto mb-24">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full border-b border-border rounded-none h-auto p-0 bg-transparent justify-start gap-8">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-4 text-lg font-serif"
              >
                Product Details
              </TabsTrigger>
              <TabsTrigger
                value="care"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-4 text-lg font-serif"
              >
                Care Instructions
              </TabsTrigger>
              <TabsTrigger
                value="shipping"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-4 text-lg font-serif"
              >
                Shipping & Returns
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="py-8 font-serif text-lg leading-relaxed text-muted-foreground">
              <p className="mb-4">
                Designed for the modern player, this collection blends traditional craftsmanship with a contemporary aesthetic. Each piece is carefully selected and finished by hand to ensure the highest quality.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-6">
                <li>Premium scratch-resistant acrylic construction</li>
                <li>Hand-painted engraved details</li>
                <li>Included: Luxury velvet storage case</li>
                <li>Dimensions: Standard tournament size</li>
              </ul>
            </TabsContent>
            <TabsContent value="care" className="py-8 font-serif text-lg leading-relaxed text-muted-foreground">
              <p>To maintain the pristine condition of your BougieBams products:</p>
              <ul className="list-disc pl-6 space-y-2 mt-6">
                <li>Wipe clean with a soft, dry microfiber cloth.</li>
                <li>Avoid exposure to direct sunlight for extended periods.</li>
                <li>Do not use harsh chemical cleaners or abrasive sponges.</li>
                <li>Store in the provided protective case when not in use.</li>
              </ul>
            </TabsContent>
            <TabsContent value="shipping" className="py-8 font-serif text-lg leading-relaxed text-muted-foreground">
              <p className="mb-4">
                We offer complimentary standard shipping on all orders over $150 within the contiguous United States.
              </p>
              <p>
                If you are not entirely satisfied with your purchase, we accept returns within 30 days of delivery. Items must be in their original condition and packaging. A small restocking fee may apply.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* You May Also Like */}
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
