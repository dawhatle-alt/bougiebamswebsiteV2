import { images } from "@/data/images";

const {
  heroTile1,
  heroTile2,
  heroTile3,
  heroTile4,
  productJade,
  productRosegold,
  mahjongTilesCloseup,
  mahjongLifestyle,
  productTablecloth,
  productAcrylicBox,
  productNapkins,
  productCardBook,
} = images;

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

export interface ApiProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  imagePath?: string | null;
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function productImageUrl(imagePath: string): string {
  return `${API_BASE}/api/storage${imagePath}`;
}

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
  prod_2: { images: [heroTile2], rating: 4.8, reviewCount: 28, isNew: true },
  prod_3: { images: [heroTile1], rating: 5.0, reviewCount: 15 },
  prod_4: { images: [productTablecloth], rating: 4.7, reviewCount: 56, isBestseller: true },
  prod_5: { images: [mahjongLifestyle], rating: 4.6, reviewCount: 19 },
  prod_6: { images: [mahjongLifestyle], rating: 4.9, reviewCount: 33 },
  prod_7: { images: [heroTile4], rating: 4.8, reviewCount: 21 },
  prod_8: { images: [mahjongTilesCloseup], rating: 5.0, reviewCount: 8 },
  prod_9: { images: [heroTile1], rating: 4.9, reviewCount: 45, isBestseller: true },
  prod_10: { images: [productTablecloth], rating: 4.7, reviewCount: 12 },
  prod_11: { images: [mahjongLifestyle], rating: 4.8, reviewCount: 27 },
  prod_12: { images: [productJade], rating: 4.5, reviewCount: 14 },
  tiles_debutante: { images: [productJade], rating: 4.9, reviewCount: 18 },
  tiles_ohmyrummi: { images: [heroTile2], rating: 4.7, reviewCount: 31, isNew: true },
  tiles_playingcards: { images: [mahjongTilesCloseup], rating: 4.8, reviewCount: 22 },
  tiles_travelsets: { images: [heroTile3], rating: 4.9, reviewCount: 14 },
  tiles_intlcard: { images: [heroTile1], rating: 4.6, reviewCount: 9 },
  mats_minitravel: { images: [productTablecloth], rating: 4.7, reviewCount: 12 },
  mats_rackpushers: { images: [productTablecloth], rating: 4.8, reviewCount: 27 },
  mats_tablecloths: { images: [productTablecloth], rating: 4.9, reviewCount: 16 },
  mats_aquajong: { images: [mahjongLifestyle], rating: 4.5, reviewCount: 7, isNew: true },
  storage_zipperedbags: { images: [productRosegold], rating: 4.8, reviewCount: 20 },
  storage_matstorage: { images: [productRosegold], rating: 4.7, reviewCount: 11 },
  storage_acrylicboxes: { images: [productAcrylicBox], rating: 4.9, reviewCount: 13 },
  acc_babies: { images: [mahjongTilesCloseup], rating: 5.0, reviewCount: 8, isNew: true },
  acc_cardfolios: { images: [productCardBook], rating: 4.6, reviewCount: 10 },
  acc_book: { images: [productCardBook], rating: 4.9, reviewCount: 24 },
  acc_napkins: { images: [productNapkins], rating: 4.7, reviewCount: 15 },
};

export const localProducts: Product[] = [
  {
    id: "local_prod_1",
    sku: "tiles_debutante",
    name: "The Debutante Set",
    price: 325,
    category: "Tiles",
    description: "Our signature Mahjong set — beautifully crafted tiles in a velvet-lined case. Perfect for the modern player who refuses to compromise on style.",
    images: [productJade],
    rating: 4.9,
    reviewCount: 42,
    inStock: true,
    isBestseller: true,
  },
  {
    id: "local_prod_2",
    sku: "tiles_ohmyrummi",
    name: "Oh My Rummikub",
    price: 89,
    category: "Tiles",
    description: "A Rummikub set reimagined with BougieBams flair. Classic game, elevated aesthetic.",
    images: [heroTile2],
    rating: 4.7,
    reviewCount: 31,
    inStock: true,
    isNew: true,
  },
  {
    id: "local_prod_3",
    sku: "mats_rackpushers",
    name: "The Rack Pusher Mat",
    price: 145,
    category: "Mats",
    description: "A luxurious game mat that keeps your tiles in place and your table protected. Available in four signature colorways.",
    images: [productTablecloth],
    rating: 4.8,
    reviewCount: 27,
    inStock: true,
    isBestseller: true,
  },
  {
    id: "local_prod_4",
    sku: "mats_tablecloths",
    name: "Game Night Tablecloth",
    price: 75,
    category: "Mats",
    description: "A beautiful tablecloth designed for game night. Spill-resistant and machine washable.",
    images: [productTablecloth],
    rating: 4.9,
    reviewCount: 16,
    inStock: true,
  },
  {
    id: "local_prod_5",
    sku: "storage_acrylicboxes",
    name: "Acrylic Tile Display Box",
    price: 58,
    category: "Storage",
    description: "Keep your tiles on display and dust-free in this sleek acrylic box. Doubles as a conversation piece.",
    images: [productAcrylicBox],
    rating: 4.9,
    reviewCount: 13,
    inStock: true,
    isNew: true,
  },
  {
    id: "local_prod_6",
    sku: "acc_book",
    name: "The BougieBams Card Book",
    price: 42,
    category: "Accessories",
    description: "The official National Mah Jongg League card, curated and shipped in a protective sleeve.",
    images: [productCardBook],
    rating: 4.9,
    reviewCount: 24,
    inStock: true,
    isBestseller: true,
  },
  {
    id: "local_prod_7",
    sku: "acc_napkins",
    name: "Game Night Cocktail Napkins",
    price: 18,
    category: "Accessories",
    description: "Elegant cocktail napkins with Mahjong motifs. A thoughtful gift for any player.",
    images: [productNapkins],
    rating: 4.7,
    reviewCount: 15,
    inStock: true,
  },
  {
    id: "local_prod_8",
    sku: "storage_zipperedbags",
    name: "Zippered Tile Bag",
    price: 32,
    category: "Storage",
    description: "A chic zippered bag for travel. Holds a full set of tiles, racks, and dice.",
    images: [productRosegold],
    rating: 4.8,
    reviewCount: 20,
    inStock: true,
  },
  {
    id: "local_prod_9",
    sku: "tiles_travelsets",
    name: "Travel Mini Set",
    price: 195,
    category: "Tiles",
    description: "A compact Mahjong set for the player on the go. Full game, half the footprint.",
    images: [heroTile3],
    rating: 4.9,
    reviewCount: 14,
    inStock: true,
  },
  {
    id: "local_prod_10",
    sku: "mats_aquajong",
    name: "AquaJong Pool Float Mat",
    price: 110,
    category: "Mats",
    description: "Waterproof game mat for poolside play. Summer just got more interesting.",
    images: [mahjongLifestyle],
    rating: 4.5,
    reviewCount: 7,
    inStock: true,
    isNew: true,
  },
  {
    id: "local_prod_11",
    sku: "acc_babies",
    name: "Tile Babies Keychains",
    price: 14,
    category: "Accessories",
    description: "Adorable miniature tile keychains — collect all the suits. A perfect stocking stuffer.",
    images: [mahjongTilesCloseup],
    rating: 5.0,
    reviewCount: 8,
    inStock: true,
    isNew: true,
  },
  {
    id: "local_prod_12",
    sku: "tiles_playingcards",
    name: "Mahjong Playing Cards",
    price: 28,
    category: "Tiles",
    description: "A deck of standard playing cards featuring iconic Mahjong tile artwork.",
    images: [mahjongTilesCloseup],
    rating: 4.8,
    reviewCount: 22,
    inStock: true,
  },
];

export function mergeProduct(api: ApiProduct): Product {
  const meta = productMeta[api.sku];
  const uploadedImage = api.imagePath ? productImageUrl(api.imagePath) : null;
  return {
    id: api.id,
    sku: api.sku,
    name: api.name,
    price: api.price,
    category: api.category,
    description: api.description,
    inStock: api.inStock,
    images: uploadedImage ? [uploadedImage] : (meta?.images ?? [DEFAULT_IMAGE]),
    rating: meta?.rating ?? 5,
    reviewCount: meta?.reviewCount ?? 0,
    isNew: meta?.isNew,
    isBestseller: meta?.isBestseller,
  };
}
