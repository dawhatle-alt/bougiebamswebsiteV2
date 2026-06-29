import { useState, useEffect } from "react";
import { BougieBamsEvent, ApiEvent, normalizeEvent } from "@/data/events";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UseEventsResult {
  events: BougieBamsEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

let cache: BougieBamsEvent[] | null = null;
let cachePromise: Promise<BougieBamsEvent[]> | null = null;

async function fetchEvents(): Promise<BougieBamsEvent[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetch(`${API_BASE}/api/events`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load events");
        return res.json();
      })
      .then((data: { events: ApiEvent[] }) => {
        const normalized = (data.events ?? []).map(normalizeEvent);
        cache = normalized;
        return normalized;
      })
      .catch((err) => {
        cachePromise = null;
        throw err;
      });
  }
  return cachePromise;
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<BougieBamsEvent[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (cache) {
      setEvents(cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchEvents()
      .then((e) => {
        if (!cancelled) { setEvents(e); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load events");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tick]);

  const refetch = () => {
    cache = null;
    cachePromise = null;
    setTick((t) => t + 1);
  };

  return { events, loading, error, refetch };
}
