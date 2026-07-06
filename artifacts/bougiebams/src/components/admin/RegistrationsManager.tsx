import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Loader2, RefreshCw, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

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
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
    const header = ["ID", "Event", "Name", "Email", "Status", "Paid", "Notes", "Date"];
    const rows = sorted.map((r) => [
      String(r.id),
      r.eventTitle,
      r.name,
      r.email,
      r.status,
      r.paid ? "Yes" : "No",
      r.notes ?? "",
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
          {registrations.length} {registrations.length === 1 ? "registration" : "registrations"}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
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
        ) : registrations.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">
            No registrations yet. They'll appear here as guests sign up for events.
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
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-[#1E2A5A] max-w-[180px] truncate">
                    {r.eventTitle}
                  </TableCell>
                  <TableCell className="text-[#1E2A5A]">{r.name}</TableCell>
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
                  </TableCell>
                  <TableCell className="text-[#5A6178]">
                    {r.paid ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Paid</span>
                    ) : (
                      <span className="text-[#5A6178]">Free</span>
                    )}
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
