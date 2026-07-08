import { useAssumptions } from "./AssumptionsContext";
import { sampleProducts } from "./types";
import { calcAllProductMetrics, calcProductTotals } from "./calculations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return isFinite(n) ? n.toFixed(1) + "%" : "—";
}

export default function BizProducts() {
  const { assumptions } = useAssumptions();

  const metrics = calcAllProductMetrics(sampleProducts, assumptions);
  const totals = calcProductTotals(metrics);

  const chartData = metrics.map((m) => ({
    name: m.name.replace("Premium ", "").replace(" Set", "s"),
    Revenue: m.revenue,
    "Gross Profit": m.grossProfit,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Product Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">Profitability and inventory by SKU — derived from assumptions</p>
      </div>

      {/* Product Table */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Product", "MSRP", "Unit Cost", "Units Sold", "Revenue", "Gross Profit", "Margin %", "Inventory Value", "Notes"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {metrics.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{m.name}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">{fmt(m.msrp)}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">{fmt(m.unitCost)}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">{m.unitsSold.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums font-medium text-foreground">{fmt(m.revenue)}</td>
                <td className="px-4 py-3 tabular-nums font-medium text-foreground">{fmt(m.grossProfit)}</td>
                <td className="px-4 py-3 tabular-nums">
                  <span className="inline-block px-2 py-0.5 bg-primary/15 text-primary font-semibold rounded text-xs">
                    {fmtPct(m.grossMargin)}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-foreground">{fmt(m.inventoryValue)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px]">{m.notes}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40">
              <td className="px-4 py-3 font-bold text-foreground">Totals</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{totals.unitsSold.toLocaleString()}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(totals.revenue)}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(totals.grossProfit)}</td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 bg-primary/20 text-primary font-bold rounded text-xs">
                  {fmtPct(totals.grossMargin)}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(totals.inventoryValue)}</td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Revenue vs Profit Chart */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Revenue vs. Gross Profit by Product</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={4} barCategoryGap="30%">
            <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend iconType="circle" iconSize={8} />
            <Bar dataKey="Revenue" fill="#c9973a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gross Profit" fill="#2e6b52" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
