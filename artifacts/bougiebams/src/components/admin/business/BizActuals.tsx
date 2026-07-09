import { useQuery } from "@tanstack/react-query";
import { useAssumptions } from "./AssumptionsContext";
import { calcRevenue } from "./calculations";
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
import { DollarSign, Receipt, Package, CalendarDays, Mail, Target, TicketPercent } from "lucide-react";

// Real store performance (orders, registrations, subscribers) vs. the Year 1
// forecast from the assumptions model. Read-only — data comes from the shop.

interface Actuals {
  products: {
    revenueCents: number;
    orderCount: number;
    unitsSold: number;
    byProduct: { name: string; quantity: number; revenueCents: number }[];
  };
  events: {
    revenueCents: number;
    orderCount: number;
    byEvent: {
      id: number;
      title: string;
      date: string;
      priceCents: number;
      capacity: number;
      confirmed: number;
      paid: number;
      revenueCents: number;
    }[];
  };
  monthly: { month: string; productCents: number; eventCents: number }[];
  subscribers: { total: number; last30: number };
  discountCentsTotal: number;
  byDiscountCode: { code: string; orders: number; revenueCents: number; discountCents: number }[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function BizActuals() {
  const { assumptions } = useAssumptions();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["biz-actuals"],
    queryFn: () => bizJson<Actuals>("/actuals"),
    retry: 1,
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading store data…</div>;
  }
  if (isError || !data) {
    return <div className="text-center py-12 text-destructive text-sm">Could not load store data. Try refreshing.</div>;
  }

  const totalActualCents = data.products.revenueCents + data.events.revenueCents;
  const forecastRevenue = calcRevenue(assumptions);
  const progressPct = forecastRevenue > 0 ? Math.min(100, (totalActualCents / 100 / forecastRevenue) * 100) : 0;
  const avgOrderCents =
    data.products.orderCount > 0 ? Math.round(data.products.revenueCents / data.products.orderCount) : 0;

  const chartData = data.monthly.map((m) => ({
    month: monthLabel(m.month),
    Products: m.productCents / 100,
    Events: m.eventCents / 100,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Store Actuals</h1>
        <p className="text-sm text-muted-foreground mt-1">Real revenue from Square orders, event registrations, and email signups</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Actual Revenue" value={fmtCents(totalActualCents)} sub="Products + events, all time" icon={<DollarSign size={16} />} />
        <StatCard label="Product Revenue" value={fmtCents(data.products.revenueCents)} sub={`${data.products.orderCount} orders · ${data.products.unitsSold} units`} icon={<Package size={16} />} />
        <StatCard label="Event Revenue" value={fmtCents(data.events.revenueCents)} sub={`${data.events.orderCount} paid checkouts`} icon={<CalendarDays size={16} />} />
        <StatCard label="Avg Order Value" value={fmtCents(avgOrderCents)} sub="Product orders" icon={<Receipt size={16} />} />
        <StatCard label="Subscribers" value={data.subscribers.total.toLocaleString()} sub={`+${data.subscribers.last30} in last 30 days`} icon={<Mail size={16} />} />
        <StatCard label="Discounts Given" value={fmtCents(data.discountCentsTotal)} sub="Across all orders" icon={<TicketPercent size={16} />} />
      </div>

      {/* Actual vs forecast progress */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Progress to Year 1 Forecast</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmtCents(totalActualCents)} actual vs. {fmt(forecastRevenue)} forecast (from Assumptions)
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-primary font-bold text-lg">
            <Target size={16} />
            {progressPct.toFixed(1)}%
          </div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Monthly revenue */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Monthly Revenue</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No completed orders yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={18}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="Products" stackId="rev" fill="#c9973a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Events" stackId="rev" fill="#2e6b52" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Product breakdown */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Sales by Product</h2>
          <p className="text-xs text-muted-foreground mt-0.5">From order line items</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70">
              {["Product", "Units Sold", "Revenue"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.products.byProduct.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-sm">No product sales yet</td></tr>
            ) : (
              data.products.byProduct.map((p) => (
                <tr key={p.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                  <td className="px-4 py-3 tabular-nums">{p.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-foreground">{fmtCents(p.revenueCents)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Discount code attribution */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Discount Code Performance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Revenue influenced per promo code</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70">
              {["Code", "Orders", "Revenue Influenced", "Discounts Given"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.byDiscountCode.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No orders with discount codes yet</td></tr>
            ) : (
              data.byDiscountCode.map((c) => (
                <tr key={c.code} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <span className="inline-block px-2 py-0.5 bg-primary/15 text-primary rounded text-xs font-bold tracking-wide">{c.code}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.orders.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-foreground">{fmtCents(c.revenueCents)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtCents(c.discountCents)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Event performance */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Event Performance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Confirmed and paid registrations per event</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70">
              {["Event", "Date", "Ticket", "Confirmed", "Paid", "Fill", "Revenue"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.events.byEvent.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No registrations yet</td></tr>
            ) : (
              data.events.byEvent.map((e) => {
                const fillPct = e.capacity > 0 ? Math.round((e.confirmed / e.capacity) * 100) : 0;
                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{e.title}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-3 tabular-nums">{e.priceCents > 0 ? fmtCents(e.priceCents) : "Free"}</td>
                    <td className="px-4 py-3 tabular-nums">{e.confirmed}</td>
                    <td className="px-4 py-3 tabular-nums">{e.paid}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${fillPct >= 80 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {fillPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-foreground">{fmtCents(e.revenueCents)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
