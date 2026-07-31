import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface TablescapeSlot {
  slot: string;
  label: string;
  description: string;
  required: boolean;
}

export interface TablescapeConfig {
  enabled: boolean;
  guestLimit: number;
  memberLimit: number;
  slots: TablescapeSlot[];
}

export interface TablescapeOption {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

export interface TablescapeSlotGroup extends TablescapeSlot {
  products: TablescapeOption[];
}

/**
 * Admin-controlled visibility. Returns undefined while loading; callers treat
 * that as hidden so a feature the owner has turned off never flashes on screen.
 */
export function useTablescapeConfig(): TablescapeConfig | undefined {
  const { data } = useQuery<TablescapeConfig>({
    queryKey: ["tablescape-config"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/tablescape/config`);
      if (!res.ok) throw new Error("Could not load the tablescape builder");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  return data;
}

export function useTablescapeProducts(enabled: boolean) {
  return useQuery<{ slots: TablescapeSlotGroup[] }>({
    queryKey: ["tablescape-products"],
    enabled,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/tablescape/products`);
      if (!res.ok) throw new Error("Could not load the collection");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

const VISITOR_KEY = "bb_tablescape_visitor";

/**
 * Stable per-browser id so guest generations can be rate limited without an
 * account. Not a security control — it's a courtesy cap on a paid API call.
 */
export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Private browsing with storage disabled — a per-session id still works.
    return crypto.randomUUID();
  }
}
