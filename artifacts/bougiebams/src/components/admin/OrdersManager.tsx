import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Loader2, RefreshCw, Search, Receipt } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface OrderItem {
  name: string;
  quantity: string;
  amountCents: number;
}

interface Order {
  id: string;
  totalCents: number;
  currency: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  shippingAddress: string | null;
  items: string; // JSON
  createdAt: string;
}

interface Props {
  onAuthError: () => void;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function parseItems(json: string): OrderItem[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function OrdersManager({ onAuthError }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { orders: Order[] };
      setOrders(data.orders ?? []);
    } catch {
      setError("Could not load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const haystack = [
        o.id,
        o.buyerName ?? "",
        o.buyerEmail ?? "",
        o.buyerPhone ?? "",
        o.shippingAddress ?? "",
        parseItems(o.items).map((i) => i.name).join(" "),
        money(o.totalCents),
        formatDate(o.createdAt),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, query]);

  const grandTotal = useMemo(() => orders.reduce((s, o) => s + o.totalCents, 0), [orders]);
  const filteredTotal = useMemo(() => filtered.reduce((s, o) => s + o.totalCents, 0), [filtered]);

  function handleExport() {
    const header = ["Order ID", "Date", "Name", "Email", "Phone", "Shipping Address", "Items", "Amount"];
    const rows = filtered.map((o) => [
      o.id,
      formatDate(o.createdAt),
      o.buyerName ?? "",
      o.buyerEmail ?? "",
      o.buyerPhone ?? "",
      (o.shippingAddress ?? "").replace(/\n/g, ", "),
      parseItems(o.items).map((i) => `${i.name} x${i.quantity}`).join("; "),
      money(o.totalCents),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bougiebams-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-md border border-[#E2DBCD] bg-white px-5 py-4">
          <div className="text-xs uppercase tracking-wider text-[#9A8F7E] mb-1">Orders</div>
          <div className="text-2xl font-medium text-[#1E2A5A]">{orders.length}</div>
        </div>
        <div className="rounded-md border border-[#E2DBCD] bg-white px-5 py-4">
          <div className="text-xs uppercase tracking-wider text-[#9A8F7E] mb-1">Running Total</div>
          <div className="text-2xl font-medium text-[#1E2A5A]">{money(grandTotal)}</div>
        </div>
        {query.trim() && (
          <div className="rounded-md border border-[#D4AF37]/50 bg-[#FDF9EE] px-5 py-4">
            <div className="text-xs uppercase tracking-wider text-[#9A8F7E] mb-1">Filtered Total ({filtered.length})</div>
            <div className="text-2xl font-medium text-[#1E2A5A]">{money(filteredTotal)}</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A8F7E]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, address, item, order id…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            disabled={filtered.length === 0}
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
        {loading && orders.length === 0 ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">
            {orders.length === 0 ? (
              <span className="inline-flex items-center gap-2">
                <Receipt className="w-4 h-4" /> No orders yet. Completed Square checkouts will appear here.
              </span>
            ) : (
              "No orders match your search."
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Ship To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                const items = parseItems(o.items);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="text-[#5A6178] whitespace-nowrap align-top">
                      {formatDate(o.createdAt)}
                      <div className="text-[10px] text-[#C5BBAC] font-mono mt-1" title={o.id}>
                        {o.id.slice(0, 10)}…
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium text-[#1E2A5A]">{o.buyerName ?? "—"}</div>
                      {o.buyerEmail && <div className="text-xs text-[#5A6178]">{o.buyerEmail}</div>}
                      {o.buyerPhone && <div className="text-xs text-[#5A6178]">{o.buyerPhone}</div>}
                    </TableCell>
                    <TableCell className="align-top text-xs text-[#5A6178] whitespace-pre-line max-w-[200px]">
                      {o.shippingAddress ?? "—"}
                    </TableCell>
                    <TableCell className="align-top text-xs text-[#5A6178] max-w-[220px]">
                      {items.length === 0
                        ? "—"
                        : items.map((i, idx) => (
                            <div key={idx}>
                              {i.name} × {i.quantity}
                            </div>
                          ))}
                    </TableCell>
                    <TableCell className="text-right align-top font-medium text-[#1E2A5A] whitespace-nowrap">
                      {money(o.totalCents)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
