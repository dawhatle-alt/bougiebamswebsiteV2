import heroTile1 from "@assets/images/hero-tile-1.png";
import heroTile2 from "@assets/images/hero-tile-2.png";
import heroTile3 from "@assets/images/hero-tile-3.png";
import heroTile4 from "@assets/images/hero-tile-4.png";
import productJade from "@assets/images/product-jade.png";
import productRosegold from "@assets/images/product-rosegold.png";
import mahjongTilesCloseup from "@assets/images/mahjong-tiles-closeup.png";
import mahjongLifestyle from "@assets/images/mahjong-lifestyle.png";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  images: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  sku?: string;
}

// Shape returned by GET /api/products (Square = source of truth for commerce data).
export interface ApiProduct {
  id: string; // Square variation id
  sku: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

// Curated brand content that Square does not store, keyed by SKU.
interface ProductMeta {
  images: string[];
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isBestseller?: boolean;
}

const DEFAULT_IMAGE = heroTile1;

export const productMeta: Record<string, ProductMeta> = {
  prod_1: { images: [productJade], rating: 4.9, reviewCount: 42, isBestseller: true },
  prod_2: { images: [productRosegold], rating: 4.8, reviewCount: 28, isNew: true },
  prod_3: { images: [heroTile1], rating: 5.0, reviewCount: 15 },
  prod_4: { images: [heroTile3], rating: 4.7, reviewCount: 56, isBestseller: true },
  prod_5: { images: [heroTile2], rating: 4.6, reviewCount: 19 },
  prod_6: { images: [mahjongLifestyle], rating: 4.9, reviewCount: 33 },
  prod_7: { images: [heroTile4], rating: 4.8, reviewCount: 21 },
  prod_8: { images: [mahjongTilesCloseup], rating: 5.0, reviewCount: 8 },
  prod_9: { images: [heroTile1], rating: 4.9, reviewCount: 45, isBestseller: true },
  prod_10: { images: [heroTile3], rating: 4.7, reviewCount: 12 },
  prod_11: { images: [mahjongLifestyle], rating: 4.8, reviewCount: 27 },
  prod_12: { images: [productJade], rating: 4.5, reviewCount: 14 },
};

// Merge live Square data with curated local metadata into a full Product.
export function mergeProduct(api: ApiProduct): Product {
  const meta = productMeta[api.sku];
  return {
    id: api.id,
    sku: api.sku,
    name: api.name,
    price: api.price,
    category: api.category,
    description: api.description,
    inStock: api.inStock,
    images: meta?.images ?? [DEFAULT_IMAGE],
    rating: meta?.rating ?? 5,
    reviewCount: meta?.reviewCount ?? 0,
    isNew: meta?.isNew,
    isBestseller: meta?.isBestseller,
  };
}
