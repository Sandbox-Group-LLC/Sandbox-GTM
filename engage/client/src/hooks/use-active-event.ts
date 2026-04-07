import { useQuery } from "@tanstack/react-query";
import { fetchJSON } from "../lib/queryClient";

export interface ActiveEvent {
  id: string;
  name: string;
  venue?: string;
  timezone?: string;
  slug?: string;
}

/**
 * Engage is single-event. This hook fetches the event list and
 * returns the first one automatically — no user selection needed.
 */
export function useActiveEvent() {
  const { data: events = [], isLoading } = useQuery<ActiveEvent[]>({
    queryKey: ["/api/events"],
    queryFn: () => fetchJSON("/api/events"),
    staleTime: 60_000,
  });

  const event = events[0] || null;

  return {
    event,
    eventId: event?.id || "",
    eventName: event?.name || "",
    isLoading,
    hasEvent: !!event,
  };
}
