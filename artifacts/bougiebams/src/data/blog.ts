import heroTile1 from "@assets/images/hero-tile-1.png";
import heroTile2 from "@assets/images/hero-tile-2.png";
import heroTile3 from "@assets/images/hero-tile-3.png";
import productJade from "@assets/images/product-jade.png";
import productRosegold from "@assets/images/product-rosegold.png";
import mahjongTilesCloseup from "@assets/images/mahjong-tiles-closeup.png";
import mahjongLifestyle from "@assets/images/mahjong-lifestyle.png";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  date: string;
  author: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: "post_1",
    title: "How to Host the Perfect Mahjong Night",
    excerpt: "Elevate your game night with our curated guide to snacks, drinks, and ambiance.",
    content: "...",
    category: "Entertaining",
    image: mahjongLifestyle,
    date: "Oct 12, 2023",
    author: "Sarah Jenkins"
  },
  {
    id: "post_2",
    title: "The Anatomy of a Luxury Tile",
    excerpt: "What makes a BougieBams tile different? We break down the craftsmanship.",
    content: "...",
    category: "Behind the Brand",
    image: mahjongTilesCloseup,
    date: "Sep 28, 2023",
    author: "Emma Collins"
  },
  {
    id: "post_3",
    title: "Understanding the Charleston",
    excerpt: "Demystifying the most complex part of American Mahjong.",
    content: "...",
    category: "How to Play",
    image: heroTile1,
    date: "Sep 15, 2023",
    author: "Jane Doe"
  },
  {
    id: "post_4",
    title: "Our Favorite Mahjong Outfits",
    excerpt: "Comfort meets style. What to wear to your next game.",
    content: "...",
    category: "Style",
    image: mahjongLifestyle,
    date: "Aug 30, 2023",
    author: "Sarah Jenkins"
  },
  {
    id: "post_5",
    title: "The Ultimate Gift Guide for the Mahjong Lover",
    excerpt: "Stuck on what to buy? We've got you covered.",
    content: "...",
    category: "Gift Guides",
    image: productRosegold,
    date: "Nov 05, 2023",
    author: "Emma Collins"
  },
  {
    id: "post_6",
    title: "History of the Game: A Brief Overview",
    excerpt: "Where did this beautiful game come from? A look back.",
    content: "...",
    category: "How to Play",
    image: heroTile2,
    date: "Jul 12, 2023",
    author: "Jane Doe"
  },
  {
    id: "post_7",
    title: "Mixing Cocktails for Game Night",
    excerpt: "Three signature drinks that won't spill on the tiles.",
    content: "...",
    category: "Entertaining",
    image: heroTile3,
    date: "Jun 20, 2023",
    author: "Sarah Jenkins"
  },
  {
    id: "post_8",
    title: "Why We Chose Jade",
    excerpt: "The inspiration behind our best-selling Jade Collection.",
    content: "...",
    category: "Behind the Brand",
    image: productJade,
    date: "May 15, 2023",
    author: "Emma Collins"
  }
];
