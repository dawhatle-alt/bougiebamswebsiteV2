export type EventCategory = "All" | "In-Person" | "Virtual" | "Tournament" | "Workshop";

export interface MobileEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number | "Free";
  category: Exclude<EventCategory, "All">;
  spotsLeft: number;
  totalSpots: number;
  host: string;
  accentColor: string;
}

export const events: MobileEvent[] = [
  {
    id: "evt_1",
    title: "Cocktails & Tiles: Summer Game Night",
    description: "An enchanting evening of Mahjong, signature cocktails, and new friends. All skill levels welcome. Canapés and sommelier-curated wine list included.",
    date: "July 19, 2025",
    time: "7:00 – 10:00 PM",
    location: "The Soho Grand, New York, NY",
    price: 85,
    category: "In-Person",
    spotsLeft: 8,
    totalSpots: 24,
    host: "BougieBams NYC",
    accentColor: "#1E2A5A",
  },
  {
    id: "evt_2",
    title: "Beginner's Workshop",
    description: "A warm, welcoming workshop for first-timers. Tiles, the Charleston, and your first complete hand. All materials provided.",
    date: "July 26, 2025",
    time: "11:00 AM – 1:00 PM",
    location: "Online — Zoom",
    price: "Free",
    category: "Virtual",
    spotsLeft: 22,
    totalSpots: 40,
    host: "Sarah Jenkins",
    accentColor: "#2A5C45",
  },
  {
    id: "evt_3",
    title: "The BougieBams Open",
    description: "Our flagship annual tournament. Compete for prizes including a limited-edition Jade Collection set. Intermediate and advanced players.",
    date: "August 9–10, 2025",
    time: "9:00 AM – 6:00 PM",
    location: "The Langham, Chicago, IL",
    price: 150,
    category: "Tournament",
    spotsLeft: 4,
    totalSpots: 32,
    host: "BougieBams Chicago",
    accentColor: "#D4AF37",
  },
  {
    id: "evt_4",
    title: "Advanced Strategy Workshop",
    description: "Master the art of the Charleston. This workshop is for players who want to level up their strategy game.",
    date: "August 16, 2025",
    time: "2:00 – 4:00 PM",
    location: "Online — Zoom",
    price: 45,
    category: "Workshop",
    spotsLeft: 14,
    totalSpots: 20,
    host: "Emma Collins",
    accentColor: "#B57CCB",
  },
  {
    id: "evt_5",
    title: "Hamptons Garden Mixer",
    description: "A sophisticated outdoor Mahjong afternoon in the Hamptons. Rosé, charcuterie, and tiles on a warm August afternoon.",
    date: "August 23, 2025",
    time: "3:00 – 7:00 PM",
    location: "Private Estate, East Hampton, NY",
    price: 120,
    category: "In-Person",
    spotsLeft: 12,
    totalSpots: 16,
    host: "BougieBams NYC",
    accentColor: "#7A6848",
  },
  {
    id: "evt_6",
    title: "Virtual Thursday Game Night",
    description: "Our weekly online game night. Drop into a table, meet players from across the country.",
    date: "Every Thursday",
    time: "8:00 – 10:00 PM",
    location: "Online — Private Platform",
    price: "Free",
    category: "Virtual",
    spotsLeft: 9,
    totalSpots: 12,
    host: "BougieBams Community",
    accentColor: "#3A4A6A",
  }
];

export const eventCategories: EventCategory[] = ["All", "In-Person", "Virtual", "Tournament", "Workshop"];
