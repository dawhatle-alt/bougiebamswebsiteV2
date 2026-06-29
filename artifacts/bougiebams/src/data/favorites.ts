export type FavoriteCategory =
  | "Winner Brags"
  | "Mahjong Essentials"
  | "Dice & Winner Brag Dishes";

export interface FavoriteProduct {
  id: string;
  name: string;
  category: FavoriteCategory;
  description: string;
  image: string;
  affiliateUrl: string;
}

export const CATEGORIES: FavoriteCategory[] = [
  "Winner Brags",
  "Mahjong Essentials",
  "Dice & Winner Brag Dishes",
];

export const CATEGORY_DESCRIPTIONS: Record<FavoriteCategory, string> = {
  "Winner Brags":
    "Small treasures displayed by a player's rack to celebrate a Mahjong win.",
  "Mahjong Essentials":
    "Our favorite accessories that help make every Mahjong game more enjoyable.",
  "Dice & Winner Brag Dishes":
    "Beautiful trays and dishes for dice, winner brags, and table accessories.",
};

export const FAVORITES: FavoriteProduct[] = [
  {
    id: "pink-flamingos",
    name: "Pink Flamingos",
    category: "Winner Brags",
    description: "A flock of rosy flamingos that bring tropical flair to your winning rack.",
    image: "/images/winner-brags/pink-flamingos.jpg",
    affiliateUrl: "https://amzn.to/4xuAl6I",
  },
  {
    id: "hot-pink-flamingos",
    name: "Hot Pink Flamingos",
    category: "Winner Brags",
    description: "Bold, electric-pink flamingos that announce your win with maximum bougie energy.",
    image: "/images/winner-brags/hot-pink-flamingos.jpg",
    affiliateUrl: "https://amzn.to/4eiGud7",
  },
  {
    id: "summer-beach-gnomes",
    name: "Summer Beach Gnomes",
    category: "Winner Brags",
    description: "Whimsical gnomes dressed for the beach — because winning deserves a celebration.",
    image: "/images/winner-brags/summer-beach-gnomes.jpg",
    affiliateUrl: "https://amzn.to/4veCu4Y",
  },
  {
    id: "highland-cows",
    name: "Highland Cows",
    category: "Winner Brags",
    description: "Adorable fluffy Highland cows that add charm and character to any winning rack.",
    image: "/images/winner-brags/highland-cows.jpg",
    affiliateUrl: "https://amzn.to/4vOHopa",
  },
  {
    id: "gemstone-handbags",
    name: "Gemstone Handbags",
    category: "Winner Brags",
    description: "Tiny jewel-toned handbags that sparkle on your rack like a victory trophy.",
    image: "/images/winner-brags/gemstone-handbags.jpg",
    affiliateUrl: "https://amzn.to/49SuHB5",
  },
  {
    id: "elephants",
    name: "Elephants",
    category: "Winner Brags",
    description: "Miniature elephants — symbols of good luck and unstoppable strength at the table.",
    image: "/images/winner-brags/elephants.jpg",
    affiliateUrl: "https://amzn.to/43smL5Z",
  },
  {
    id: "handblown-yellow-ducks",
    name: "Handblown Yellow Ducks",
    category: "Winner Brags",
    description: "Artisan glass ducks in sunny yellow — each one a tiny handcrafted masterpiece.",
    image: "/images/winner-brags/handblown-yellow-ducks.jpg",
    affiliateUrl: "https://amzn.to/44aQQqN",
  },
  {
    id: "blue-eyed-brass-dog",
    name: "Blue Eyed Brass Dog",
    category: "Winner Brags",
    description: "A loyal brass pup with striking blue eyes — sophisticated, unique, and utterly bougie.",
    image: "/images/winner-brags/blue-eyed-brass-dog.jpg",
    affiliateUrl: "https://amzn.to/444fxVQ",
  },
  {
    id: "blue-eyed-brass-cat",
    name: "Blue Eyed Brass Cat",
    category: "Winner Brags",
    description: "A regal brass cat with sapphire eyes that watches over your winning tiles in style.",
    image: "/images/winner-brags/blue-eyed-brass-cat.jpg",
    affiliateUrl: "https://amzn.to/4vL2VyX",
  },
  {
    id: "blue-eyed-brass-dragon",
    name: "Blue Eyed Brass Dragon",
    category: "Winner Brags",
    description: "A mythical brass dragon with vivid blue eyes — the ultimate power move on your rack.",
    image: "/images/winner-brags/blue-eyed-brass-dragon.jpg",
    affiliateUrl: "https://amzn.to/49Vcfrs",
  },
  {
    id: "bronze-mini-cowbells",
    name: "Bronze Mini Cowbells",
    category: "Winner Brags",
    description: "Tiny bronze cowbells that let everyone at the table know you've won — again.",
    image: "/images/winner-brags/bronze-mini-cowbells.jpg",
    affiliateUrl: "https://amzn.to/3S8jAOk",
  },
  {
    id: "yellow-glass-ducks",
    name: "Yellow Glass Ducks",
    category: "Winner Brags",
    description: "Cheerful glass ducks in golden yellow that bring sunshine and smiles to every game.",
    image: "/images/winner-brags/yellow-glass-ducks.jpg",
    affiliateUrl: "https://amzn.to/4e57H4j",
  },
  {
    id: "good-luck-horseshoes",
    name: "Good Luck Horseshoes",
    category: "Winner Brags",
    description: "Classic good-luck horseshoes to display proudly and keep the winning streak going.",
    image: "/images/winner-brags/good-luck-horseshoes.jpg",
    affiliateUrl: "https://amzn.to/4vOHWeE",
  },
  {
    id: "gold-crowns",
    name: "Gold Crowns",
    category: "Winner Brags",
    description: "Miniature gold crowns fit for royalty — because every Mahjong winner deserves a throne.",
    image: "/images/winner-brags/gold-crowns.jpg",
    affiliateUrl: "https://amzn.to/4v1PPx7",
  },
  {
    id: "brass-bees",
    name: "Brass Bees",
    category: "Winner Brags",
    description: "Gleaming brass bees that are as industrious and fabulous as the player who just won.",
    image: "/images/winner-brags/brass-bees.jpg",
    affiliateUrl: "https://amzn.to/4geClcP",
  },
  {
    id: "brass-butterflies",
    name: "Brass Butterflies",
    category: "Winner Brags",
    description: "Delicate brass butterflies that flutter beautifully on your rack after a flawless win.",
    image: "/images/winner-brags/brass-butterflies.jpg",
    affiliateUrl: "https://amzn.to/3S7Psma",
  },
  {
    id: "nmjl-large-card-sleeves",
    name: "NMJL Large Card Sleeves",
    category: "Mahjong Essentials",
    description: "The perfect protective sleeves for your NMJL card — keep it pristine all season long.",
    image: "/images/mahjong-essentials/nmjl-large-card-sleeves.jpg",
    affiliateUrl: "https://amzn.to/4uC2i9Z",
  },
  {
    id: "slap-bracelets-for-rolled-mats",
    name: "Slap Bracelets for Rolled Mats",
    category: "Mahjong Essentials",
    description: "Clever slap bracelets that keep your rolled mat tidy and ready for the next bougie game night.",
    image: "/images/mahjong-essentials/slap-bracelets-for-rolled-mats.jpg",
    affiliateUrl: "https://amzn.to/4eDfZQZ",
  },
  {
    id: "three-clear-dishes",
    name: "Three Clear Dishes",
    category: "Dice & Winner Brag Dishes",
    description: "A trio of crystal-clear dishes that elegantly organize dice, brags, and small accessories.",
    image: "/images/dishes/three-clear-dishes.jpg",
    affiliateUrl: "https://amzn.to/4uBB5UX",
  },
  {
    id: "clear-glass-tray",
    name: "Clear Glass Tray",
    category: "Dice & Winner Brag Dishes",
    description: "A sleek glass tray that keeps your table looking polished and your accessories within reach.",
    image: "/images/dishes/clear-glass-tray.jpg",
    affiliateUrl: "https://amzn.to/4eAwq0x",
  },
  {
    id: "bee-kind-dish",
    name: "Bee Kind Dish",
    category: "Dice & Winner Brag Dishes",
    description: "A sweet little dish with a buzzing reminder to keep the game fun and the vibes kind.",
    image: "/images/dishes/bee-kind-dish.jpg",
    affiliateUrl: "https://amzn.to/4uwKCwk",
  },
  {
    id: "glass-crown-dish",
    name: "Glass Crown Dish",
    category: "Dice & Winner Brag Dishes",
    description: "A crown-shaped glass dish fit for a Mahjong queen — display your brags in royal style.",
    image: "/images/dishes/glass-crown-dish.jpg",
    affiliateUrl: "https://amzn.to/49Yfcrk",
  },
  {
    id: "brass-flower-bird-dish",
    name: "Brass Flower Bird Dish",
    category: "Dice & Winner Brag Dishes",
    description: "An intricate brass dish with floral and bird motifs that brings artisan beauty to the table.",
    image: "/images/dishes/brass-flower-bird-dish.jpg",
    affiliateUrl: "https://amzn.to/4xoSJOd",
  },
  {
    id: "tiny-oak-dish",
    name: "Tiny Oak Dish",
    category: "Dice & Winner Brag Dishes",
    description: "A warm, natural oak dish that adds rustic elegance alongside your finest Mahjong accessories.",
    image: "/images/dishes/tiny-oak-dish.jpg",
    affiliateUrl: "https://amzn.to/4epuWFd",
  },
  {
    id: "pink-blue-green-flower-trays",
    name: "Pink, Blue & Green Flower Trays",
    category: "Dice & Winner Brag Dishes",
    description: "Vibrant floral trays in three gorgeous colors — mix and match for an effortlessly chic tablescape.",
    image: "/images/dishes/pink-blue-green-flower-trays.jpg",
    affiliateUrl: "https://amzn.to/3QghF9W",
  },
  {
    id: "cloud-flower-dish",
    name: "Cloud Flower Dish",
    category: "Dice & Winner Brag Dishes",
    description: "A dreamy cloud-and-flower shaped dish that floats beautifully on any Mahjong table.",
    image: "/images/dishes/cloud-flower-dish.jpg",
    affiliateUrl: "https://amzn.to/4ooO0rH",
  },
];
