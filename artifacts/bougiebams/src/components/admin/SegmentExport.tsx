import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Users } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Campaign audiences, exported as CSV for Resend Broadcasts / Mailchimp.
// Opted-out addresses are stripped server-side, so nothing exported here can
// reach someone who unsubscribed.

interface Segment {
  key: string;
  label: string;
  description: string;
  needsEvent?: boolean;
  count: number | null;
}

interface EventOption {
  id: number;
  title: string;
  date: string;
}

export default function SegmentExport({ onAuthError }: { onAuthError: () => void }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/marketing/segments`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { segments: Segment[] };
      setSegments(data.segments ?? []);
      setSelected((prev) => prev || data.segments?.[0]?.key || "");
      const evRes = await fetch(`${API_BASE}/api/admin/events`, { credentials: "include" });
      if (evRes.ok) {
        const evData = await evRes.json() as { events: EventOption[] };
        setEvents([...(evData.events ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1)));
      }
    } catch {
      setError("Could not load segments.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  const current = segments.find((s) => s.key === selected);
  const needsEvent = !!current?.needsEvent;
  const ready = !!selected && (!needsEvent || !!eventId);

  async function handleDownload() {
    if (!ready) return;
    setDownloading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ segment: selected });
      if (needsEvent) qs.set("eventId", eventId);
      const res = await fetch(`${API_BASE}/api/admin/marketing/export?${qs}`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bougiebams-${selected.replace(/_/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not export that segment. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mb-6 rounded-md border border-[#E2DBCD] bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[#D4AF37]" />
        <span className="text-sm font-medium text-[#1E2A5A]">Campaign segments</span>
        <span className="text-xs text-[#9A8F7E]">— export a CSV for your email tool</span>
      </div>

      {loading ? (
        <div className="py-4 flex items-center gap-2 text-sm text-[#5A6178]">
          <Loader2 className="w-4 h-4 animate-spin" /> Counting audiences…
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[16rem]">
              <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Audience</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full h-9 rounded-md border border-[#E2DBCD] bg-white px-3 text-sm text-[#1E2A5A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              >
                {segments.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}{s.count != null ? ` (${s.count})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {needsEvent && (
              <div className="flex-1 min-w-[16rem]">
                <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Event</label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full h-9 rounded-md border border-[#E2DBCD] bg-white px-3 text-sm text-[#1E2A5A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                >
                  <option value="">Pick an event…</option>
                  {events.map((e) => (
                    <option key={e.id} value={String(e.id)}>{e.title} — {e.date}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => void handleDownload()}
              disabled={!ready || downloading}
              className="h-9 inline-flex items-center rounded-md bg-[#1E2A5A] px-3 text-sm font-medium text-[#FAF7F0] hover:bg-[#172248] disabled:opacity-40"
            >
              {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download CSV
            </button>
          </div>

          {current && (
            <p className="text-xs text-[#9A8F7E] mt-2">
              {current.description}
              {current.count != null && <> · <strong>{current.count}</strong> {current.count === 1 ? "person" : "people"}</>}
            </p>
          )}
          <p className="text-xs text-[#9A8F7E] mt-1">
            Anyone who unsubscribed is left out of every export automatically.
          </p>
        </>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
