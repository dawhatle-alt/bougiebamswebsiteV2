import mahjongLifestyle from "@assets/images/mahjong-lifestyle.png";
import mahjongTilesCloseup from "@assets/images/mahjong-tiles-closeup.png";
import heroTile1 from "@assets/images/hero-tile-1.png";
import heroTile2 from "@assets/images/hero-tile-2.png";
import heroTile3 from "@assets/images/hero-tile-3.png";
import heroTile4 from "@assets/images/hero-tile-4.png";
import productJade from "@assets/images/product-jade.png";
import productRosegold from "@assets/images/product-rosegold.png";

export type EventCategory = "All" | "In-Person" | "Virtual" | "Tournament" | "Workshop";

export interface BougieBamsEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number | "Free";
  category: Exclude<EventCategory, "All">;
  image: string;
  spotsLeft: number;
  totalSpots: number;
  host: string;
}

export const events: BougieBamsEvent[] = [
  {
    id: "evt_1",
    title: "Cocktails & Tiles: A Summer Game Night",
    description: "Join us for an enchanting evening of Mahjong, signature cocktails, and new friends. All skill levels welcome. Canapés and a sommelier-curated wine list included.",
    date: "July 19, 2025",
    time: "7:00 PM – 10:00 PM",
    location: "The Soho Grand Hotel, New York, NY",
    price: 85,
    category: "In-Person",
    image: mahjongLifestyle,
    spotsLeft: 8,
    totalSpots: 24,
    host: "BougieBams NYC",
  },
  {
    id: "evt_2",
    title: "Beginner's Workshop: Learn to Play in 2 Hours",
    description: "A warm, welcoming workshop for first-timers. We'll cover the tiles, the Charleston, and your first complete hand. All materials provided.",
    date: "July 26, 2025",
    time: "11:00 AM – 1:00 PM",
    location: "Zoom — Link sent upon registration",
    price: "Free",
    category: "Virtual",
    image: heroTile1,
    spotsLeft: 22,
    totalSpots: 40,
    host: "Sarah Jenkins",
  },
  {
    id: "evt_3",
    title: "The BougieBams Open: Summer Invitational",
    description: "Our flagship annual tournament. Compete for prizes, including a limited-edition Jade Collection set. Open to intermediate and advanced players.",
    date: "August 9–10, 2025",
    time: "9:00 AM – 6:00 PM",
    location: "The Langham Hotel, Chicago, IL",
    price: 150,
    category: "Tournament",
    image: mahjongTilesCloseup,
    spotsLeft: 4,
    totalSpots: 32,
    host: "BougieBams Chicago",
  },
  {
    id: "evt_4",
    title: "Advanced Strategy: The Charleston Deep Dive",
    description: "Master the art of the Charleston — the most misunderstood part of American Mahjong. This workshop is for players who want to level up their strategy.",
    date: "August 16, 2025",
    time: "2:00 PM – 4:00 PM",
    location: "Zoom — Link sent upon registration",
    price: 45,
    category: "Workshop",
    image: heroTile2,
    spotsLeft: 14,
    totalSpots: 20,
    host: "Emma Collins",
  },
  {
    id: "evt_5",
    title: "BougieBams in the Garden: Hamptons Mixer",
    description: "A sophisticated outdoor Mahjong afternoon in the heart of the Hamptons. Rosé, charcuterie, and the sound of tiles on a warm August afternoon.",
    date: "August 23, 2025",
    time: "3:00 PM – 7:00 PM",
    location: "Private Estate, East Hampton, NY",
    price: 120,
    category: "In-Person",
    image: productRosegold,
    spotsLeft: 12,
    totalSpots: 16,
    host: "BougieBams NYC",
  },
  {
    id: "evt_6",
    title: "Virtual Game Night: Play from Anywhere",
    description: "Our weekly online game night. Drop into a table, meet fellow players from across the country, and play a few hands together.",
    date: "Every Thursday",
    time: "8:00 PM – 10:00 PM",
    location: "Online — private game platform",
    price: "Free",
    category: "Virtual",
    image: heroTile3,
    spotsLeft: 9,
    totalSpots: 12,
    host: "BougieBams Community",
  },
  {
    id: "evt_7",
    title: "Tiles & Tasting: A Tea Ceremony x Mahjong Afternoon",
    description: "A serene and beautiful afternoon pairing the ritual of a traditional tea ceremony with a relaxed game of Mahjong. Limited to 10 guests.",
    date: "September 6, 2025",
    time: "1:00 PM – 4:00 PM",
    location: "Cha Cha Matcha Studio, Los Angeles, CA",
    price: 95,
    category: "In-Person",
    image: productJade,
    spotsLeft: 3,
    totalSpots: 10,
    host: "BougieBams LA",
  },
  {
    id: "evt_8",
    title: "Reading the Card: Beginner-to-Intermediate",
    description: "Demystify the National Mah Jongg League card. This workshop walks through the card structure, common hands, and how to build a winning strategy.",
    date: "September 13, 2025",
    time: "12:00 PM – 2:00 PM",
    location: "Zoom — Link sent upon registration",
    price: 35,
    category: "Workshop",
    image: heroTile4,
    spotsLeft: 18,
    totalSpots: 30,
    host: "Emma Collins",
  }
];
