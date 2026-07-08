import { useQuery } from "@tanstack/react-query";
import { useAssumptions } from "./AssumptionsContext";
import { sampleProducts, type BusinessEvent } from "./types";
import {
  calcRevenue,
  calcGrossProfit,
  calcGrossMargin,
  calcStartupCapitalUsed,
  calcStartupCapitalRemaining,
  calcEventRevenue,
  calcBreakEvenUnits,
  calcEventProfitPerEvent,
  calcAllProductMetrics,
  calcProductTotals,
  buildDashboardKPIs,
} from "./calculations";
import { bizJson } from "./api";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, DollarSign, Percent, Wallet, Layers, CalendarDays, Megaphone, Target } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return n.toFixed(1) + "%";
}

const CHART_COLORS = ["#c9973a", "#2e6b52", "#d4849b", "#d4b57a", "#6b9c88"];

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}
function KpiCard({ label, value, sub, icon, highlight }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border border-card-border shadow-sm p-5 flex flex-col gap-2 ${highlight ? "bg-primary/10" : "bg-card"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-foreground leading-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function BizDashboard() {
  const { assumptions } = useAssumptions();

  const { data: events = [] } = useQuery({
    queryKey: ["biz-events"],
    queryFn: () => bizJson<BusinessEvent[]>("/events"),
    retry: 1,
  });

  // All metrics derived from centralized calculation functions
  const revenue = calcRevenue(assumptions);
  const grossProfit = calcGrossProfit(assumptions);
  const grossMargin = calcGrossMargin(assumptions);
  const capitalUsed = calcStartupCapitalUsed(assumptions);
  const capitalRemaining = calcStartupCapitalRemaining(assumptions);
  const eventRevenue = calcEventRevenue(events);
  const breakEvenUnits = calcBreakEvenUnits(assumptions);
  const profitPerEvent = calcEventProfitPerEvent(assumptions);

  const productMetrics = calcAllProductMetrics(sampleProducts, assumptions);
  const productTotals = calcProductTotals(productMetrics);
  const inventoryValue = productTotals.inventoryValue;

  const totalUnitsTarget =
    assumptions.tileSetUnitsTarget +
    assumptions.matUnitsTarget +
    assumptions.luxuryBoxUnitsTarget +
    assumptions.rackSetUnitsTarget;

  const productMix = productMetrics.map((m) => ({ name: m.name, value: m.revenue }));

  // Monthly event revenue trend (evenly distributed with seasonal curve)
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const eventsPerMonth = assumptions.eventsPerYear / 12;
  const monthlyEventData = monthLabels.map((month, i) => ({
    month,
    revenue: Math.round(eventsPerMonth * profitPerEvent * (0.7 + 0.6 * Math.sin((i / 12) * Math.PI))),
  }));

  const breakEvenPct = Math.min(100, (totalUnitsTarget / Math.max(1, breakEvenUnits)) * 100);

  const kpiRows = buildDashboardKPIs(assumptions, events, inventoryValue).filter(
    (k, i, arr) => arr.findIndex((x) => x.label === k.label) === i
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Year 1 forecast — all figures based on current assumptions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={fmt(revenue)} sub="Year 1 projected" icon={<DollarSign size={16} />} highlight />
        <KpiCard label="Gross Profit" value={fmt(grossProfit)} sub="After COGS" icon={<TrendingUp size={16} />} />
        <KpiCard label="Gross Margin" value={fmtPct(grossMargin)} sub="Net of product costs" icon={<Percent size={16} />} />
        <KpiCard label="Event Revenue" value={fmt(eventRevenue)} sub="Net event profit" icon={<CalendarDays size={16} />} />
        <KpiCard label="Capital Used" value={fmt(capitalUsed)} sub="Equipment + inventory + mktg" icon={<Wallet size={16} />} />
        <KpiCard label="Capital Remaining" value={fmt(capitalRemaining)} sub={`of ${fmt(assumptions.startupCapital)} total`} icon={<Wallet size={16} />} />
        <KpiCard label="Inventory Value" value={fmt(inventoryValue)} sub="On-hand at cost" icon={<Layers size={16} />} />
        <KpiCard label="Marketing Budget" value={fmt(assumptions.yearOneMarketingBudget)} sub="Year 1 planned" icon={<Megaphone size={16} />} />
      </div>

      {/* Break-Even Progress */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Break-Even Progress</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Target {totalUnitsTarget.toLocaleString()} units vs. break-even at {Math.round(breakEvenUnits).toLocaleString()} units
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-primary font-bold text-lg">
            <Target size={16} />
            {fmtPct(breakEvenPct)}
          </div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${breakEvenPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>0</span>
          <span>Break-even: {Math.round(breakEvenUnits).toLocaleString()} units</span>
          <span>{totalUnitsTarget.toLocaleString()}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Product Revenue Mix</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={productMix}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {productMix.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Event Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyEventData} barSize={14}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="revenue" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} name="Net Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Summary Table */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm p-6 overflow-x-auto">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Top KPIs</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted-foreground font-semibold pb-2 text-xs uppercase tracking-wide">Metric</th>
              <th className="text-right text-muted-foreground font-semibold pb-2 text-xs uppercase tracking-wide">Value</th>
              <th className="text-right text-muted-foreground font-semibold pb-2 text-xs uppercase tracking-wide">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {kpiRows.map((row) => (
              <tr key={row.label} className="hover:bg-muted/40 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-foreground">{row.label}</td>
                <td className="py-2.5 text-right font-semibold text-foreground tabular-nums">{row.value}</td>
                <td className="py-2.5 text-right text-muted-foreground text-xs">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
