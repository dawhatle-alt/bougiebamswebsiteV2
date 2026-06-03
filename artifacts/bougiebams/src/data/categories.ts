export interface ShopCategory {
  name: string;
  description: string;
}

// Canonical shop categories (must match the categories Square returns).
export const SHOP_CATEGORIES: ShopCategory[] = [
  { name: "Complete Sets", description: "Signature mahjong sets, ready to play." },
  { name: "Tiles & Accessories", description: "Tiles, dice, racks, and the finishing touches." },
  { name: "Gift Sets", description: "Beautifully curated sets, made to gift." },
  { name: "Apparel & Lifestyle", description: "Wear the game. Live the lifestyle." },
];
