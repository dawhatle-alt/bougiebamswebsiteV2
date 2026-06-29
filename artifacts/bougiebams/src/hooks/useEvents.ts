import { useListEvents } from "@workspace/api-client-react";
import { BougieBamsEvent, ApiEvent, normalizeEvent } from "@/data/events";

interface UseEventsResult {
  events: BougieBamsEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEvents(): UseEventsResult {
  const { data, isLoading, isError, error, refetch } = useListEvents();

  const events: BougieBamsEvent[] = (data?.events ?? []).map((e) =>
    normalizeEvent(e as unknown as ApiEvent),
  );

  return {
    events,
    loading: isLoading,
    error: isError ? (error instanceof Error ? error.message : "Failed to load events") : null,
    refetch,
  };
}
