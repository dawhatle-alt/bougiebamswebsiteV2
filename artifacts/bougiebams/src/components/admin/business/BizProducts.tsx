import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { bizJson } from "./api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  unitCost?: number | null;
  category: string;
  inStock: boolean;
  published: boolean;
}

interface ActualsProducts {
  products: {
    revenueCents: number;
    orderCount: number;
    unitsSold: number;
    byProduct: { name: string; quantity: number; revenueCents: number }[];
  };
}

interface Row {
  key: string;
  name: string;
  price: number | null;
  unitCost: number | null;
  unitsSold: number;
  revenue: number;
  grossProfit: number | null;
  margin: number | null;
  status: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtExact(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function BizProducts() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Sequential fetches keep the serverless side happy.
        const actuals = await bizJson<ActualsProducts>("/actuals");
        const res = await fetch(`${API_BASE}/api/admin/products`, { credentials: "include" });
        if (!res.ok) throw new Error("products fetch failed");
        const { products } = (await res.json()) as { products: AdminProduct[] };
        if (cancelled) return;

        const soldByName = new Map(actuals.products.byProduct.map((p) => [p.name, p]));
        const matchedNames = new Set<string>();

        const catalogRows: Row[] = products.map((p) => {
          const sold = soldByName.get(p.name);
          if (sold) matchedNames.add(p.name);
          const unitsSold = sold?.quantity ?? 0;
          const revenue = (sold?.revenueCents ?? 0) / 100;
          const unitCost = p.unitCost ?? null;
          const grossProfit = unitCost != null ? revenue - unitsSold * unitCost : null;
          return {
            key: p.id,
            name: p.name,
            price: p.price,
            unitCost,
            unitsSold,
            revenue,
            grossProfit,
            margin: grossProfit != null && revenue > 0 ? (grossProfit / revenue) * 100 : null,
            status: !p.published ? "Hidden" : p.inStock ? "Live" : "Sold out",
          };
        });

        // Sales recorded under names that aren't in today's catalog (manual
        // payment links, renamed or deleted products) still count.
        const legacy = actuals.products.byProduct.filter((p) => !matchedNames.has(p.name));
        if (legacy.length > 0) {
          const quantity = legacy.reduce((s, p) => s + p.quantity, 0);
          const revenueCents = legacy.reduce((s, p) => s + p.revenueCents, 0);
          catalogRows.push({
            key: "__legacy__",
            name: `Other / legacy sales (${legacy.map((l) => l.name).slice(0, 3).join(", ")}${legacy.length > 3 ? "…" : ""})`,
            price: null,
            unitCost: null,
            unitsSold: quantity,
            revenue: revenueCents / 100,
            grossProfit: null,
            margin: null,
            status: "—",
          });
        }

        catalogRows.sort((a, b) => b.revenue - a.revenue);
        setRows(catalogRows);
      } catch {
        if (!cancelled) setError("Could not load product performance.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <div className="py-16 text-center text-sm text-red-600">{error}</div>;
  if (!rows) {
    return (
      <div className="py-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const totals = rows.reduce(
    (t, r) => ({
      unitsSold: t.unitsSold + r.unitsSold,
      revenue: t.revenue + r.revenue,
      grossProfit: t.grossProfit + (r.grossProfit ?? 0),
      costsKnown: t.costsKnown && (r.key === "__legacy__" || r.unitCost != null),
    }),
    { unitsSold: 0, revenue: 0, grossProfit: 0, costsKnown: true },
  );
  const missingCosts = rows.some((r) => r.key !== "__legacy__" && r.unitCost == null);

  const chartData = rows
    .filter((r) => r.revenue > 0)
    .slice(0, 8)
    .map((r) => ({
      name: r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name,
      Revenue: Math.round(r.revenue),
      ...(r.grossProfit != null ? { "Gross Profit": Math.round(r.grossProfit) } : {}),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Product Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your real catalog with actual sales from completed orders. Margins appear once a product's Unit Cost is set (Admin → Products → Edit).
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Product", "Price", "Unit Cost", "Units Sold", "Revenue", "Gross Profit", "Margin %", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground">{r.name}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">{r.price != null ? fmtExact(r.price) : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">{r.unitCost != null ? fmtExact(r.unitCost) : <span className="text-muted-foreground text-xs">not set</span>}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">{r.unitsSold.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums font-medium text-foreground">{fmt(r.revenue)}</td>
                <td className="px-4 py-3 tabular-nums font-medium text-foreground">{r.grossProfit != null ? fmt(r.grossProfit) : "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {r.margin != null ? (
                    <span className="inline-block px-2 py-0.5 bg-primary/15 text-primary font-semibold rounded text-xs">{r.margin.toFixed(1)}%</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.status}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40">
              <td className="px-4 py-3 font-bold text-foreground">Totals (actual)</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{totals.unitsSold.toLocaleString()}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(totals.revenue)}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{totals.costsKnown ? fmt(totals.grossProfit) : `${fmt(totals.grossProfit)}+`}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {missingCosts && (
        <p className="text-xs text-muted-foreground">
          Some products have no Unit Cost yet, so their margin can't be computed — the profit total only covers products with a cost entered.
        </p>
      )}

      {chartData.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Actual Revenue by Product</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="Revenue" fill="#c9973a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gross Profit" fill="#2e6b52" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
