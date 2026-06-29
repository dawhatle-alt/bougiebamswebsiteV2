import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { FavoriteProduct } from "@/data/favorites";

const CATEGORY_GRADIENTS: Record<string, string> = {
  "Winner Brags": "from-primary/25 via-primary/10 to-background",
  "Mahjong Essentials": "from-foreground/20 via-foreground/10 to-background",
  "Dice & Winner Brag Dishes": "from-primary/20 via-background to-foreground/10",
};

interface ProductCardProps {
  product: FavoriteProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const gradient = CATEGORY_GRADIENTS[product.category] ?? "from-primary/20 to-background";

  return (
    <div className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {!imgFailed ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient}`}>
            <span className="font-serif text-5xl text-primary/30 select-none">BB</span>
          </div>
        )}
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-primary border border-primary/20 shadow-sm">
          {product.category}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <h3 className="font-serif text-xl font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          {product.description}
        </p>
        <a
          href={product.affiliateUrl}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="mt-1 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #b08a1e 0%, #C9A227 50%, #ddb93a 100%)" }}
        >
          View on Amazon
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>
    </div>
  );
}
