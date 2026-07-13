import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Download, Loader2, RefreshCw, Trash2, ArrowUp, ArrowDown, ArrowUpDown, ClipboardList, Mail, UserPlus } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Registration {
  id: number;
  eventId: number;
  eventTitle: string;
  name: string;
  email: string;
  notes: string | null;
  status: string;
  paid: boolean;
  createdAt: string;
  seatingPreference?: string | null;
  tilePreference?: string | null;
  skillLevel?: string | null;
  compCodeUsed?: string | null;
}

interface Props {
  onAuthError: () => void;
}

type SortKey = "eventTitle" | "name" | "email" | "status" | "paid" | "createdAt";
type SortDir = "asc" | "desc";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function RegistrationsManager({ onAuthError }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [allEvents, setAllEvents] = useState<{ id: number; title: string; date: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ eventId: "", name: "", email: "", notes: "", paid: true });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [emailTo, setEmailTo] = useState("patsy@bougiebams.com");
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [sentMsg, setSentMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { registrations: Registration[] };
      setRegistrations(data.registrations ?? []);
    } catch {
      setError("Could not load registrations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const arr = [...registrations];
    arr.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "paid") {
        av = a.paid ? 1 : 0;
        bv = b.paid ? 1 : 0;
      } else if (sortKey === "createdAt") {
        // ISO timestamps sort chronologically as plain strings.
        av = a.createdAt;
        bv = b.createdAt;
      } else {
        av = (a[sortKey] ?? "").toString().toLowerCase();
        bv = (b[sortKey] ?? "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [registrations, sortKey, sortDir]);

  const events = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of registrations) {
      if (!map.has(r.eventId)) map.set(r.eventId, r.eventTitle);
    }
    return Array.from(map, ([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [registrations]);

  const visible = useMemo(
    () => (eventFilter === "all" ? sorted : sorted.filter((r) => String(r.eventId) === eventFilter)),
    [sorted, eventFilter],
  );

  async function handleDownloadReport() {
    if (eventFilter === "all") return;
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${eventFilter}/checkin-report`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const title = events.find((e) => String(e.id) === eventFilter)?.title ?? "event";
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `checkin-${slug}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download the check-in report.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleEmailReport() {
    if (eventFilter === "all" || !emailTo.trim()) return;
    setEmailing(true);
    setError("");
    setSentMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${eventFilter}/checkin-report/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: emailTo.trim() }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
      if (!res.ok) throw new Error(data.error || "Failed");
      setSentMsg(`Check-in report emailed to ${data.to ?? emailTo.trim()}.`);
      setTimeout(() => setSentMsg(""), 5000);
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed" ? err.message : "Could not email the report. Please try again.");
    } finally {
      setEmailing(false);
    }
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/events`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { events: { id: number; title: string; date: string }[] } | null) => {
        if (data?.events) {
          setAllEvents([...data.events].sort((a, b) => (a.date < b.date ? 1 : -1)));
        }
      })
      .catch(() => {});
  }, []);

  async function handleAdd() {
    if (!addForm.eventId) { setAddError("Pick an event."); return; }
    if (!addForm.name.trim()) { setAddError("Name is required."); return; }
    if (!addForm.email.trim()) { setAddError("Email is required."); return; }
    setAddSaving(true);
    setAddError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventId: Number(addForm.eventId),
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          notes: addForm.notes.trim() || undefined,
          paid: addForm.paid,
        }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      const { registration } = await res.json() as { registration: Registration };
      setRegistrations((prev) => [registration, ...prev]);
      setAddOpen(false);
      setAddForm({ eventId: "", name: "", email: "", notes: "", paid: true });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add the registration.");
    } finally {
      setAddSaving(false);
    }
  }

  async function verifyWithSquare(reg: Registration) {
    setVerifyingId(reg.id);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/registrations/${reg.id}/verify-payment`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { status: string };
      if (data.status === "confirmed") {
        setRegistrations((prev) => prev.map((r) => (r.id === reg.id ? { ...r, status: "confirmed", paid: true } : r)));
      } else {
        setError(`Square shows no completed payment for ${reg.name}'s checkout — still ${data.status}. If they paid another way, use the Paid toggle or Add Registration.`);
      }
    } catch {
      setError("Could not verify with Square. Please try again.");
    } finally {
      setVerifyingId(null);
    }
  }

  async function togglePaid(reg: Registration) {
    setTogglingId(reg.id);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations/${reg.id}/paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paid: !reg.paid }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      setRegistrations((prev) => prev.map((r) => (r.id === reg.id ? { ...r, paid: !reg.paid } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the paid flag.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Remove this registration? This cannot be undone.")) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Could not remove the registration. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleExport() {
    const header = ["ID", "Event", "Name", "Email", "Status", "Paid", "Notes", "Sit With", "Blanks & Jokers", "Skill Level", "Comp Code", "Date"];
    const rows = visible.map((r) => [
      String(r.id),
      r.eventTitle,
      r.name,
      r.email,
      r.status,
      r.paid ? "Yes" : "No",
      r.notes ?? "",
      r.seatingPreference ?? "",
      r.tilePreference ?? "",
      r.skillLevel ?? "",
      r.compCodeUsed ?? "",
      formatDate(r.createdAt),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bougiebams-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function SortHead({ label, col, align }: { label: string; col: SortKey; align?: "right" }) {
    const active = sortKey === col;
    return (
      <TableHead className={align === "right" ? "text-right" : ""}>
        <button
          type="button"
          onClick={() => toggleSort(col)}
          className={`inline-flex items-center gap-1 hover:text-[#1E2A5A] transition-colors ${
            align === "right" ? "flex-row-reverse" : ""
          }`}
          title={`Sort by ${label}`}
        >
          {label}
          {active ? (
            sortDir === "asc"
              ? <ArrowUp className="w-3.5 h-3.5" />
              : <ArrowDown className="w-3.5 h-3.5" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
          )}
        </button>
      </TableHead>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="text-[#1E2A5A] text-lg font-medium">
          {visible.length} {visible.length === 1 ? "registration" : "registrations"}
          {eventFilter !== "all" && registrations.length !== visible.length && (
            <span className="text-sm text-[#9A8F7E] font-normal ml-1">of {registrations.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => { setAddError(""); setAddOpen(true); }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Registration
          </Button>
          <Button
            onClick={handleExport}
            disabled={registrations.length === 0}
            className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => { if (!addSaving) setAddOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1E2A5A]">Add Registration</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#5A6178] -mt-1">
            For guests who paid outside the website (Square invoice, manual payment link, at the door).
            Takes a spot on the event; no confirmation email is sent.
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Event *</label>
              <select
                className="w-full h-9 rounded-md border border-[#E2DBCD] bg-white px-3 text-sm text-[#1E2A5A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                value={addForm.eventId}
                onChange={(e) => setAddForm((f) => ({ ...f, eventId: e.target.value }))}
              >
                <option value="">Select an event…</option>
                {allEvents.map((e) => (
                  <option key={e.id} value={e.id}>{e.title} ({e.date})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Name *</label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Guest name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Email *</label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="guest@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Notes</label>
              <Input
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional — e.g. paid via Square invoice"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#1E2A5A] cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.paid}
                onChange={(e) => setAddForm((f) => ({ ...f, paid: e.target.checked }))}
                className="rounded border-[#E2DBCD]"
              />
              Mark as paid
            </label>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleAdd()}
                disabled={addSaving}
                className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
              >
                {addSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding…</> : "Add Registration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-6 rounded-md border border-[#E2DBCD] bg-white p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-sm font-medium text-[#1E2A5A]">Check-in report</span>
        </div>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="h-9 rounded-md border border-[#E2DBCD] bg-white px-3 text-sm text-[#1E2A5A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 min-w-[200px]"
        >
          <option value="all">All events…</option>
          {events.map((e) => (
            <option key={e.id} value={String(e.id)}>{e.title}</option>
          ))}
        </select>
        {eventFilter !== "all" && (
          <>
            <Button variant="outline" size="sm" onClick={() => void handleDownloadReport()} disabled={downloading}>
              {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download CSV
            </Button>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="patsy@bougiebams.com"
                className="h-9 w-56"
              />
              <Button
                size="sm"
                onClick={() => void handleEmailReport()}
                disabled={emailing || !emailTo.trim()}
                className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
              >
                {emailing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Report
              </Button>
            </div>
          </>
        )}
        {eventFilter === "all" && (
          <span className="text-xs text-[#9A8F7E]">Pick an event to download or email its participant list.</span>
        )}
      </div>

      {sentMsg && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {sentMsg}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
        {loading && registrations.length === 0 ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">
            {registrations.length === 0
              ? "No registrations yet. They'll appear here as guests sign up for events."
              : "No registrations for this event yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Event" col="eventTitle" />
                <SortHead label="Name" col="name" />
                <SortHead label="Email" col="email" />
                <SortHead label="Status" col="status" />
                <SortHead label="Paid" col="paid" />
                <SortHead label="Date" col="createdAt" align="right" />
                <TableHead className="text-right w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-[#1E2A5A] max-w-[180px] truncate">
                    {r.eventTitle}
                  </TableCell>
                  <TableCell className="text-[#1E2A5A]">
                    {r.name}
                    {(r.skillLevel || r.tilePreference || r.seatingPreference || r.compCodeUsed) && (
                      <div className="text-[11px] text-[#9A8F7E] mt-0.5 max-w-[240px]">
                        {[
                          r.skillLevel,
                          r.tilePreference ? `Blanks/jokers: ${r.tilePreference}` : null,
                          r.seatingPreference ? `Sit with: ${r.seatingPreference}` : null,
                          r.compCodeUsed ? `Comp: ${r.compCodeUsed}` : null,
                        ].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[#5A6178]">{r.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : r.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {r.status}
                    </span>
                    {r.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => void verifyWithSquare(r)}
                        disabled={verifyingId === r.id}
                        title="Check Square for a completed payment on this registration's checkout — confirms it if paid"
                        className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#1E2A5A] underline underline-offset-2 hover:text-[#D4AF37] disabled:opacity-50"
                      >
                        {verifyingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Verify
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-[#5A6178]">
                    <button
                      type="button"
                      onClick={() => void togglePaid(r)}
                      disabled={togglingId === r.id}
                      title={r.paid ? "Click to mark unpaid (manual marks only)" : "Click to mark as paid (e.g. paid via Square directly)"}
                      className="cursor-pointer disabled:opacity-50"
                    >
                      {togglingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#9A8F7E]" />
                      ) : r.paid ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">Paid</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-[#5A6178] border border-dashed border-[#C5BBAC] hover:border-[#1E2A5A] hover:text-[#1E2A5A] transition-colors">Free</span>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right text-[#5A6178]">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-[#9A8F7E] hover:text-red-600 hover:bg-red-50"
                      onClick={() => void handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      title="Remove registration"
                    >
                      {deletingId === r.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
