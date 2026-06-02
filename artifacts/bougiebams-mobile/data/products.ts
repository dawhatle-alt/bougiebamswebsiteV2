export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  accentColor: string;
}

export const products: Product[] = [
  {
    id: "prod_1",
    name: "The Jade Collection",
    price: 350,
    category: "Complete Sets",
    description: "Our signature jade green mahjong set with custom gold engraving. 166 tiles, custom dice, and a luxury velvet carrying case.",
    rating: 4.9,
    reviewCount: 42,
    inStock: true,
    isBestseller: true,
    accentColor: "#2A5C45",
  },
  {
    id: "prod_2",
    name: "The Rose Gold Edition",
    price: 325,
    category: "Complete Sets",
    description: "A stunning blush and rose gold set that catches the light beautifully.",
    rating: 4.8,
    reviewCount: 28,
    inStock: true,
    isNew: true,
    accentColor: "#B96E81",
  },
  {
    id: "prod_3",
    name: "Classic Ivory & Navy",
    price: 295,
    category: "Complete Sets",
    description: "Timeless sophistication. Crisp ivory tiles with deep navy and gold detailing.",
    rating: 5.0,
    reviewCount: 15,
    inStock: true,
    accentColor: "#1D2840",
  },
  {
    id: "prod_4",
    name: "Blush Playing Mat",
    price: 85,
    category: "Tiles & Accessories",
    description: "Premium neoprene playing mat in our signature blush with gold stitched edging.",
    rating: 4.7,
    reviewCount: 56,
    inStock: true,
    isBestseller: true,
    accentColor: "#C8857A",
  },
  {
    id: "prod_5",
    name: "Gold Foil Playing Cards",
    price: 35,
    category: "Tiles & Accessories",
    description: "Beautifully illustrated cards featuring our tile designs in a portable format.",
    rating: 4.6,
    reviewCount: 19,
    inStock: true,
    accentColor: "#D49A20",
  },
  {
    id: "prod_6",
    name: "The Hostess Gift Set",
    price: 150,
    category: "Gift Sets",
    description: "The perfect gift — custom cocktail napkins, luxury score cards, and our signature gold pen.",
    rating: 4.9,
    reviewCount: 33,
    inStock: true,
    accentColor: "#7A6848",
  },
  {
    id: "prod_7",
    name: "Midnight Blue Racks",
    price: 110,
    category: "Tiles & Accessories",
    description: "Set of 4 deep navy acrylic racks with integrated pushers.",
    rating: 4.8,
    reviewCount: 21,
    inStock: true,
    accentColor: "#1D2840",
  },
  {
    id: "prod_8",
    name: "BougieBams Silk Scarf",
    price: 65,
    category: "Apparel & Lifestyle",
    description: "100% silk scarf featuring a custom print of our most iconic tile designs.",
    rating: 5.0,
    reviewCount: 8,
    inStock: true,
    accentColor: "#B96E81",
  },
  {
    id: "prod_9",
    name: "The Beginner's Bundle",
    price: 395,
    category: "Gift Sets",
    description: "Everything you need to start playing in style. Includes the Classic Ivory Set, mat, and rulebook.",
    rating: 4.9,
    reviewCount: 45,
    inStock: true,
    isBestseller: true,
    accentColor: "#2A5C45",
  },
  {
    id: "prod_10",
    name: "Champagne Coin Set",
    price: 45,
    category: "Tiles & Accessories",
    description: "Heavy metal coins in a champagne gold finish for keeping score in style.",
    rating: 4.7,
    reviewCount: 12,
    inStock: true,
    accentColor: "#C4933E",
  },
  {
    id: "prod_11",
    name: "Embroidered Crewneck",
    price: 95,
    category: "Apparel & Lifestyle",
    description: "Cozy premium cotton crewneck subtly embroidered with a single gold Bam tile.",
    rating: 4.8,
    reviewCount: 27,
    inStock: true,
    accentColor: "#3A3A4A",
  },
  {
    id: "prod_12",
    name: "Travel Mahjong Set",
    price: 185,
    category: "Complete Sets",
    description: "A beautifully compact set for the player on the go. Smaller tiles in a chic vegan leather zip case.",
    rating: 4.5,
    reviewCount: 14,
    inStock: false,
    accentColor: "#5C7A4A",
  }
];

export const categories = ["All", "Complete Sets", "Tiles & Accessories", "Gift Sets", "Apparel & Lifestyle"] as const;
