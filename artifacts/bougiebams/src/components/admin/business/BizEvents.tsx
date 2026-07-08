import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BusinessEvent } from "./types";
import { calcEventNetProfit } from "./calculations";
import { bizFetch, bizJson } from "./api";
import { Plus, X } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

async function fetchEvents(): Promise<BusinessEvent[]> {
  return bizJson<BusinessEvent[]>("/events");
}

async function createEvent(event: Omit<BusinessEvent, "id">): Promise<BusinessEvent> {
  return bizJson<BusinessEvent>("/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

async function deleteEvent(id: string): Promise<void> {
  const res = await bizFetch(`/events/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete event");
}

interface EventRowProps {
  event: BusinessEvent;
  onDelete: (id: string) => void;
}
function EventRow({ event, onDelete }: EventRowProps) {
  const netProfit = calcEventNetProfit(event);
  const ticketRevenue = event.attendees * event.ticketPrice;
  const cac = event.emailSignups > 0 ? (event.attendees * event.venueCostPerAttendee + event.otherExpenses) / event.emailSignups : null;
  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{event.name}</td>
      <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">{event.date}</td>
      <td className="px-4 py-3 tabular-nums">{event.attendees}</td>
      <td className="px-4 py-3 tabular-nums">{fmt(event.ticketPrice)}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmt(event.venueCostPerAttendee)}/pp</td>
      <td className="px-4 py-3 tabular-nums font-medium">{fmt(ticketRevenue)}</td>
      <td className="px-4 py-3 tabular-nums font-semibold text-foreground">
        <span className={netProfit >= 0 ? "text-green-700" : "text-destructive"}>{fmt(netProfit)}</span>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{event.emailSignups || "—"}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{event.instagramFollowersGained || "—"}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{cac ? fmt(cac) : "—"}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(event.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
          title="Delete event"
        >
          <X size={14} />
        </button>
      </td>
    </tr>
  );
}

const emptyEvent = (): Omit<BusinessEvent, "id"> => ({
  name: "",
  date: "",
  status: "upcoming",
  attendees: 0,
  ticketPrice: 30,
  venueCostPerAttendee: 12,
  otherExpenses: 0,
  emailSignups: 0,
  instagramFollowersGained: 0,
  productSalesGenerated: 0,
});

export default function BizEvents() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyEvent());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["biz-events"],
    queryFn: fetchEvents,
    retry: 1,
  });

  const addMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["biz-events"] });
      setForm(emptyEvent());
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biz-events"] }),
  });

  const completed = events.filter((e) => e.status === "completed");
  const upcoming = events.filter((e) => e.status === "upcoming");

  const totalAttendees = completed.reduce((s, e) => s + e.attendees, 0);
  const totalRevenue = completed.reduce((s, e) => s + calcEventNetProfit(e), 0);
  const totalSignups = completed.reduce((s, e) => s + e.emailSignups, 0);

  const handleAdd = () => {
    if (!form.name || !form.date) return;
    addMutation.mutate(form);
  };

  const fieldSet = (k: keyof typeof form, v: string | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const colHeaders = ["Event Name", "Date", "Attendees", "Ticket Price", "Venue Cost", "Ticket Revenue", "Net Profit", "Email Signups", "IG Followers", "Est. CAC", ""];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Event Profit Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Track financials and acquisition metrics per event</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Add Event
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Completed Events", value: completed.length.toString() },
          { label: "Total Attendees", value: totalAttendees.toLocaleString() },
          { label: "Total Net Revenue", value: fmt(totalRevenue) },
          { label: "Email Signups", value: totalSignups.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl shadow-sm p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{isLoading ? "…" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Completed Events */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Completed Events</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70">
              {colHeaders.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : completed.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">No completed events yet</td></tr>
            ) : (
              completed.map((e) => <EventRow key={e.id} event={e} onDelete={(id) => deleteMutation.mutate(id)} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Upcoming Events */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Upcoming Events</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70">
              {colHeaders.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : upcoming.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">No upcoming events</td></tr>
            ) : (
              upcoming.map((e) => <EventRow key={e.id} event={e} onDelete={(id) => deleteMutation.mutate(id)} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Add New Event</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Event Name", key: "name", type: "text" },
                { label: "Date", key: "date", type: "date" },
                { label: "Status", key: "status", type: "select", options: ["upcoming", "completed"] },
                { label: "Attendees", key: "attendees", type: "number" },
                { label: "Ticket Price ($)", key: "ticketPrice", type: "number" },
                { label: "Venue Cost / Person ($)", key: "venueCostPerAttendee", type: "number" },
                { label: "Other Expenses ($)", key: "otherExpenses", type: "number" },
              ].map(({ label, key, type, options }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
                  {type === "select" ? (
                    <select
                      value={form[key as keyof typeof form] as string}
                      onChange={(e) => fieldSet(key as keyof typeof form, e.target.value)}
                      className="bg-input/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {options!.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type}
                      value={form[key as keyof typeof form] as string | number}
                      onChange={(e) => fieldSet(key as keyof typeof form, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                      className="bg-input/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-border rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.name || !form.date || addMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {addMutation.isPending ? "Saving…" : "Add Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
