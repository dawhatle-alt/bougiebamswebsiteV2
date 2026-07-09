import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BusinessEvent } from "./types";
import { calcEventNetProfit, calcEventTicketRevenue } from "./calculations";
import { bizFetch, bizJson } from "./api";
import { Plus, X, Store } from "lucide-react";

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

type CostField = "venueCostPerAttendee" | "emailSignups" | "instagramFollowersGained";

async function updateEventCosts(sourceEventId: number, data: Partial<Record<CostField, number>>): Promise<void> {
  const res = await bizFetch(`/events/store/${sourceEventId}/costs`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update event costs");
}

interface EventRowProps {
  event: BusinessEvent;
  onDelete: (id: string) => void;
  onCostChange: (event: BusinessEvent, field: CostField, value: number) => void;
}
function EventRow({ event, onDelete, onCostChange }: EventRowProps) {
  const isStore = event.source === "store";
  const netProfit = calcEventNetProfit(event);
  const ticketRevenue = calcEventTicketRevenue(event);
  const cac = event.emailSignups > 0 ? (event.attendees * event.venueCostPerAttendee + event.otherExpenses) / event.emailSignups : null;

  const costInput = (field: CostField, width: string, step?: number) => (
    <input
      type="number"
      value={event[field]}
      min={0}
      step={step ?? 1}
      onChange={(e) => onCostChange(event, field, parseFloat(e.target.value) || 0)}
      className={`${width} text-right bg-input/60 border border-border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring`}
    />
  );

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
        {event.name}
        {isStore && (
          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-bold uppercase tracking-wide align-middle">
            <Store size={10} />
            Store
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">{event.date}</td>
      <td className="px-4 py-3 tabular-nums">{event.attendees}</td>
      <td className="px-4 py-3 tabular-nums">{fmt(event.ticketPrice)}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {isStore ? costInput("venueCostPerAttendee", "w-20", 1) : `${fmt(event.venueCostPerAttendee)}/pp`}
      </td>
      <td className="px-4 py-3 tabular-nums font-medium">{fmt(ticketRevenue)}</td>
      <td className="px-4 py-3 tabular-nums font-semibold text-foreground">
        <span className={netProfit >= 0 ? "text-green-700" : "text-destructive"}>{fmt(netProfit)}</span>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {isStore ? costInput("emailSignups", "w-16") : event.emailSignups || "—"}
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {isStore ? costInput("instagramFollowersGained", "w-16") : event.instagramFollowersGained || "—"}
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{cac ? fmt(cac) : "—"}</td>
      <td className="px-4 py-3">
        {!isStore && (
          <button
            onClick={() => onDelete(event.id)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            title="Delete event"
          >
            <X size={14} />
          </button>
        )}
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
  // Local overlay so cost edits render immediately while the save debounces
  const [costOverrides, setCostOverrides] = useState<Record<string, Partial<Record<CostField, number>>>>({});
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: serverEvents = [], isLoading } = useQuery({
    queryKey: ["biz-events"],
    queryFn: fetchEvents,
    retry: 1,
  });

  const events = serverEvents.map((e) =>
    costOverrides[e.id] ? { ...e, ...costOverrides[e.id] } : e
  );

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

  const costMutation = useMutation({
    mutationFn: ({ sourceEventId, data }: { sourceEventId: number; data: Partial<Record<CostField, number>> }) =>
      updateEventCosts(sourceEventId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biz-events"] }),
  });

  const handleCostChange = (event: BusinessEvent, field: CostField, value: number) => {
    if (!event.sourceEventId) return;
    setCostOverrides((prev) => ({
      ...prev,
      [event.id]: { ...prev[event.id], [field]: value },
    }));
    if (debounceRefs.current[event.id]) clearTimeout(debounceRefs.current[event.id]);
    debounceRefs.current[event.id] = setTimeout(() => {
      const data = { ...costOverrides[event.id], [field]: value };
      costMutation.mutate({ sourceEventId: event.sourceEventId!, data });
    }, 600);
  };

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

  const renderTable = (title: string, rows: BusinessEvent[], emptyText: string) => (
    <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
          ) : rows.length === 0 ? (
            <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">{emptyText}</td></tr>
          ) : (
            rows.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                onDelete={(id) => deleteMutation.mutate(id)}
                onCostChange={handleCostChange}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Event Profit Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Store events sync automatically with real attendance and ticket revenue — enter venue costs and marketing outcomes to complete the ROI picture
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Add Manual Event
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

      {renderTable("Completed Events", completed, "No completed events yet")}
      {renderTable("Upcoming Events", upcoming, "No upcoming events")}

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Add Manual Event</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              For pop-ups and events not sold through the website. Site events appear automatically with real numbers.
            </p>
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
