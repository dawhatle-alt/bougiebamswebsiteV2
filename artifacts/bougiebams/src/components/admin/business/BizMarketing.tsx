import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAssumptions } from "./AssumptionsContext";
import type { MarketingChannel } from "./types";
import { calcCAC, calcROAS } from "./calculations";
import { bizJson } from "./api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AlertCircle } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const COLORS = ["#c9973a", "#2e6b52", "#d4849b", "#d4b57a", "#6b9c88", "#8b7355"];

async function fetchChannels(): Promise<MarketingChannel[]> {
  return bizJson<MarketingChannel[]>("/marketing-channels");
}

async function updateChannel(id: string, data: Partial<MarketingChannel>): Promise<MarketingChannel> {
  return bizJson<MarketingChannel>(`/marketing-channels/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export default function BizMarketing() {
  const { assumptions } = useAssumptions();
  const qc = useQueryClient();
  const budget = assumptions.yearOneMarketingBudget;
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: serverChannels = [], isLoading } = useQuery({
    queryKey: ["biz-marketing-channels"],
    queryFn: fetchChannels,
    retry: 1,
  });

  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (serverChannels.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setChannels(serverChannels);
    }
  }, [serverChannels]);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MarketingChannel> }) =>
      updateChannel(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biz-marketing-channels"] }),
  });

  const handleChange = (id: string, field: keyof MarketingChannel, value: number) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

    if (debounceRefs.current[id]) clearTimeout(debounceRefs.current[id]);
    debounceRefs.current[id] = setTimeout(() => {
      mutation.mutate({ id, data: { [field]: value } });
    }, 600);
  };

  const allocationData = channels.map((c) => ({
    name: c.name.split(" / ")[0],
    Budget: Math.round((c.allocationPct / 100) * budget),
  }));

  const totalSpend = channels.reduce((s, c) => s + c.spend, 0);
  const totalCustomers = channels.reduce((s, c) => s + c.customers, 0);
  const totalRevInfluenced = channels.reduce((s, c) => s + c.revenueInfluenced, 0);
  const blendedCAC = totalCustomers > 0 ? totalSpend / totalCustomers : 0;
  const blendedROAS = totalSpend > 0 ? totalRevInfluenced / totalSpend : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Marketing Budget & CAC</h1>
        <p className="text-sm text-muted-foreground mt-1">Year 1 allocation based on {fmt(budget)} total budget</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Budget", value: fmt(budget) },
          { label: "Total Spend", value: fmt(totalSpend) },
          { label: "Blended CAC", value: fmt(blendedCAC) },
          { label: "Blended ROAS", value: blendedROAS.toFixed(2) + "x" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl shadow-sm p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{isLoading ? "…" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Budget Allocation Chart */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Budget Allocation by Channel</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={allocationData} layout="vertical" barSize={18} margin={{ left: 120, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Bar dataKey="Budget" radius={[0, 4, 4, 0]}>
              {allocationData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
          {channels.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              {c.name}: {c.allocationPct}%
            </div>
          ))}
        </div>
      </div>

      {/* Channel Performance Table */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Channel Performance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Edit spend, leads, customers, and revenue influenced per channel</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70">
              {["Channel", "Budget", "Spend", "Leads", "Customers", "CAC", "ROAS", "Rev. Influenced"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : channels.map((c) => {
              const channelBudget = Math.round((c.allocationPct / 100) * budget);
              const cac = calcCAC(c);
              const roas = calcROAS(c);
              return (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground text-xs max-w-[180px] leading-tight">{c.name}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{fmt(channelBudget)}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={c.spend}
                      min={0}
                      onChange={(e) => handleChange(c.id, "spend", parseFloat(e.target.value) || 0)}
                      className="w-24 text-right bg-input/60 border border-border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={c.leads}
                      min={0}
                      onChange={(e) => handleChange(c.id, "leads", parseInt(e.target.value) || 0)}
                      className="w-20 text-right bg-input/60 border border-border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={c.customers}
                      min={0}
                      onChange={(e) => handleChange(c.id, "customers", parseInt(e.target.value) || 0)}
                      className="w-20 text-right bg-input/60 border border-border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-medium text-foreground">{cac > 0 ? fmt(cac) : "—"}</td>
                  <td className="px-4 py-2.5 tabular-nums font-medium text-foreground">
                    <span className={roas > 1 ? "text-green-700" : roas > 0 ? "text-foreground" : "text-muted-foreground"}>
                      {roas > 0 ? roas.toFixed(2) + "x" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={c.revenueInfluenced}
                      min={0}
                      onChange={(e) => handleChange(c.id, "revenueInfluenced", parseFloat(e.target.value) || 0)}
                      className="w-24 text-right bg-input/60 border border-border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40">
              <td className="px-4 py-3 font-bold text-foreground">Totals</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(budget)}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(totalSpend)}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{channels.reduce((s, c) => s + c.leads, 0).toLocaleString()}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{totalCustomers.toLocaleString()}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(blendedCAC)}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{blendedROAS.toFixed(2)}x</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(totalRevInfluenced)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-start gap-3 bg-accent/40 border border-accent-border rounded-xl p-4">
        <AlertCircle size={15} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Future integrations: </span>
          Real sales attribution from store orders and discount codes — coming in Phase 2
        </p>
      </div>
    </div>
  );
}
