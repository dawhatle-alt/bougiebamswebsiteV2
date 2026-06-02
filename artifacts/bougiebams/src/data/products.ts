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
}

export const products: Product[] = [
  {
    id: "prod_1",
    name: "The Jade Collection",
    price: 350,
    category: "Complete Sets",
    description: "Our signature jade green mahjong set with custom gold engraving. Elevate your game night with tiles that look as good as they play. Includes 166 tiles, custom dice, and a luxury velvet carrying case.",
    images: [productJade],
    rating: 4.9,
    reviewCount: 42,
    inStock: true,
    isBestseller: true,
  },
  {
    id: "prod_2",
    name: "The Rose Gold Edition",
    price: 325,
    category: "Complete Sets",
    description: "A stunning blush and rose gold set that catches the light beautifully. Perfect for the modern player who loves a touch of warmth.",
    images: [productRosegold],
    rating: 4.8,
    reviewCount: 28,
    inStock: true,
    isNew: true,
  },
  {
    id: "prod_3",
    name: "Classic Ivory & Navy",
    price: 295,
    category: "Complete Sets",
    description: "Timeless sophistication. Crisp ivory tiles with deep navy and gold detailing. The perfect set for the purist.",
    images: [heroTile1],
    rating: 5.0,
    reviewCount: 15,
    inStock: true,
  },
  {
    id: "prod_4",
    name: "Blush Playing Mat",
    price: 85,
    category: "Tiles & Accessories",
    description: "A premium neoprene playing mat in our signature blush color with gold stitched edging. Provides the perfect surface for smooth tile shuffling.",
    images: [heroTile3],
    rating: 4.7,
    reviewCount: 56,
    inStock: true,
    isBestseller: true,
  },
  {
    id: "prod_5",
    name: "Gold Foil Playing Cards",
    price: 35,
    category: "Tiles & Accessories",
    description: "For when you want the mahjong aesthetic in a portable format. Beautifully illustrated cards featuring our tile designs.",
    images: [heroTile2],
    rating: 4.6,
    reviewCount: 19,
    inStock: true,
  },
  {
    id: "prod_6",
    name: "The Hostess Gift Set",
    price: 150,
    category: "Gift Sets",
    description: "The perfect gift for your mahjong group host. Includes custom cocktail napkins, a set of luxury score cards, and our signature gold pen.",
    images: [mahjongLifestyle],
    rating: 4.9,
    reviewCount: 33,
    inStock: true,
  },
  {
    id: "prod_7",
    name: "Midnight Blue Racks",
    price: 110,
    category: "Tiles & Accessories",
    description: "Set of 4 deep navy acrylic racks with integrated pushers. A sleek upgrade to standard plastic racks.",
    images: [heroTile4],
    rating: 4.8,
    reviewCount: 21,
    inStock: true,
  },
  {
    id: "prod_8",
    name: "BougieBams Silk Scarf",
    price: 65,
    category: "Apparel & Lifestyle",
    description: "A 100% silk scarf featuring a custom print of our most iconic tile designs. Wear it, frame it, or tie it to your mahjong bag.",
    images: [mahjongTilesCloseup],
    rating: 5.0,
    reviewCount: 8,
    inStock: true,
  },
  {
    id: "prod_9",
    name: "The Beginner's Bundle",
    price: 395,
    category: "Gift Sets",
    description: "Everything you need to start playing in style. Includes the Classic Ivory Set, a playing mat, and our beautifully illustrated rulebook.",
    images: [heroTile1],
    rating: 4.9,
    reviewCount: 45,
    inStock: true,
    isBestseller: true,
  },
  {
    id: "prod_10",
    name: "Champagne Coin Set",
    price: 45,
    category: "Tiles & Accessories",
    description: "A set of heavy, metal coins in a champagne gold finish for keeping score in style.",
    images: [heroTile3],
    rating: 4.7,
    reviewCount: 12,
    inStock: true,
  },
  {
    id: "prod_11",
    name: "Embroidered Crewneck",
    price: 95,
    category: "Apparel & Lifestyle",
    description: "A cozy, premium cotton crewneck subtly embroidered with a single gold Bam tile.",
    images: [mahjongLifestyle],
    rating: 4.8,
    reviewCount: 27,
    inStock: true,
  },
  {
    id: "prod_12",
    name: "Travel Mahjong Set",
    price: 185,
    category: "Complete Sets",
    description: "A beautifully compact set for the player on the go. Smaller tiles in a chic vegan leather zip case.",
    images: [productJade],
    rating: 4.5,
    reviewCount: 14,
    inStock: false,
  }
];
