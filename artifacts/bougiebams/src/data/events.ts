import { images } from "@/data/images";

const heroTile1 = images.heroTile1;

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

export interface ApiEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  priceCents: number | null;
  category: Exclude<EventCategory, "All">;
  imagePath: string | null;
  totalSpots: number;
  spotsLeft: number;
  host: string;
  published: boolean;
  archived?: boolean;
  reminderHoursBefore: number | null;
  externalRegistrationUrl?: string | null;
  collectRegistrationDetails?: boolean;
  hasCompCode?: boolean;
  compCode?: string | null;
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function eventImageUrl(imagePath: string): string {
  return `${API_BASE}/api/storage${imagePath}`;
}

export function normalizeEvent(api: ApiEvent): BougieBamsEvent {
  return {
    id: String(api.id),
    title: api.title,
    description: api.description,
    date: api.date,
    time: api.time,
    location: api.location,
    price: api.priceCents === null ? "Free" : api.priceCents / 100,
    category: api.category,
    image: api.imagePath ? eventImageUrl(api.imagePath) : heroTile1,
    totalSpots: api.totalSpots,
    spotsLeft: api.spotsLeft,
    host: api.host,
  };
}
