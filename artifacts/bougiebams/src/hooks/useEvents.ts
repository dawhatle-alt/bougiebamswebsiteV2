import { useEffect, useState } from "react";
import { BougieBamsEvent, ApiEvent, normalizeEvent } from "@/data/events";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UseEventsResult {
  events: BougieBamsEvent[];
  loading: boolean;
  error: string;
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<BougieBamsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/events`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load events");
        return r.json() as Promise<{ events: ApiEvent[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setEvents((data.events ?? []).map(normalizeEvent));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load events right now. Please try again.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { events, loading, error };
}
