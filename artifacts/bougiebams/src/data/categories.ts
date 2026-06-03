export interface ShopCategory {
  name: string;
  description: string;
}

// Canonical shop categories (must match the categories Square returns).
export const SHOP_CATEGORIES: ShopCategory[] = [
  { name: "TILES", description: "Tiles, sets, cards, and the essentials of play." },
  { name: "MATS & RACKS", description: "Mats, racks, and pushers for the perfect setup." },
  { name: "STORAGE", description: "Bags and boxes to keep your set pristine." },
  { name: "ACCESSORIES", description: "Books, folios, napkins, and finishing touches." },
];
