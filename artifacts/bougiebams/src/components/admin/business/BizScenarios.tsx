import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAssumptions } from "./AssumptionsContext";
import type { Scenario } from "./types";
import { calcScenarioRevenue, calcScenarioNetProfit, calcGrossProfit, calcRevenue } from "./calculations";
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

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const SCENARIO_COLORS: Record<string, string> = {
  Conservative: "#6b9c88",
  Expected: "#c9973a",
  Aggressive: "#2e6b52",
};

async function fetchScenarios(): Promise<Scenario[]> {
  return bizJson<Scenario[]>("/scenarios");
}

async function saveScenario(id: string, data: Partial<Scenario>): Promise<Scenario> {
  return bizJson<Scenario>(`/scenarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

interface ScenarioColProps {
  scenario: Scenario;
  onChange: (id: string, field: keyof Scenario, val: number) => void;
  revenue: number;
  grossProfit: number;
  marketingSpend: number;
  eventsRevenue: number;
  netProfit: number;
}

function ScenarioCol({ scenario, onChange, revenue, grossProfit, marketingSpend, eventsRevenue, netProfit }: ScenarioColProps) {
  const color = SCENARIO_COLORS[scenario.name] || "#c9973a";
  const borderClass = scenario.name === "Expected" ? "border-primary" : "border-card-border";
  return (
    <div className={`bg-card border-2 ${borderClass} rounded-2xl shadow-sm p-5 flex flex-col gap-4`}>
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <h2 className="text-base font-bold text-foreground">{scenario.name}</h2>
        {scenario.name === "Expected" && (
          <span className="ml-auto text-xs bg-primary/15 text-primary font-semibold px-2 py-0.5 rounded-full">Baseline</span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Units Sold Multiplier</label>
          <input
            type="number"
            value={scenario.unitsSoldMultiplier}
            min={0.1}
            max={5}
            step={0.1}
            onChange={(e) => onChange(scenario.id, "unitsSoldMultiplier", parseFloat(e.target.value) || 0.1)}
            className="w-full text-right bg-input/60 border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">× base units target</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Marketing Spend Multiplier</label>
          <input
            type="number"
            value={scenario.marketingSpendMultiplier}
            min={0.1}
            step={0.1}
            onChange={(e) => onChange(scenario.id, "marketingSpendMultiplier", parseFloat(e.target.value) || 0.1)}
            className="w-full text-right bg-input/60 border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Event Count</label>
          <input
            type="number"
            value={scenario.eventCount}
            min={0}
            onChange={(e) => onChange(scenario.id, "eventCount", parseInt(e.target.value) || 0)}
            className="w-full text-right bg-input/60 border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        {[
          { label: "Revenue", value: fmt(revenue) },
          { label: "Gross Profit", value: fmt(grossProfit) },
          { label: "Marketing Spend", value: fmt(marketingSpend) },
          { label: "Events Revenue", value: fmt(eventsRevenue) },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">{row.value}</span>
          </div>
        ))}

        <div className="pt-2 border-t border-border flex justify-between items-baseline">
          <span className="text-sm font-semibold text-foreground">Est. Net Profit</span>
          <span className={`text-lg font-bold tabular-nums ${netProfit >= 0 ? "text-green-700" : "text-destructive"}`}>
            {fmt(netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BizScenarios() {
  const { assumptions } = useAssumptions();
  const qc = useQueryClient();
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: serverScenarios = [], isLoading } = useQuery({
    queryKey: ["biz-scenarios"],
    queryFn: fetchScenarios,
    retry: 1,
  });

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (serverScenarios.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setScenarios(serverScenarios);
    }
  }, [serverScenarios]);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Scenario> }) => saveScenario(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biz-scenarios"] }),
  });

  const updateScenario = (id: string, field: keyof Scenario, val: number) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: val } : s)));

    if (debounceRefs.current[id]) clearTimeout(debounceRefs.current[id]);
    debounceRefs.current[id] = setTimeout(() => {
      mutation.mutate({ id, data: { [field]: val } });
    }, 600);
  };

  const baseRevenue = calcRevenue(assumptions);
  const baseGrossProfit = calcGrossProfit(assumptions);
  const baseEventProfit =
    (assumptions.avgAttendees * assumptions.avgTicketPrice) -
    (assumptions.avgAttendees * assumptions.avgVenueCostPerAttendee);

  const scenarioData = scenarios.map((s) => {
    const revenue = calcScenarioRevenue(assumptions, s);
    const grossProfit = baseGrossProfit * s.unitsSoldMultiplier;
    const marketingSpend = assumptions.yearOneMarketingBudget * s.marketingSpendMultiplier;
    const eventsRevenue = s.eventCount * baseEventProfit;
    const netProfit = calcScenarioNetProfit(assumptions, s);
    return { scenario: s, revenue, grossProfit, marketingSpend, eventsRevenue, netProfit };
  });

  const chartData = scenarioData.map(({ scenario, revenue, grossProfit, netProfit }) => ({
    name: scenario.name,
    Revenue: revenue,
    "Gross Profit": grossProfit,
    "Net Profit": netProfit,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Scenario Modeling</h1>
        <p className="text-sm text-muted-foreground mt-1">Adjust multipliers per scenario — outputs recalculate from base assumptions</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading scenarios…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {scenarioData.map(({ scenario, revenue, grossProfit, marketingSpend, eventsRevenue, netProfit }) => (
              <ScenarioCol
                key={scenario.id}
                scenario={scenario}
                onChange={updateScenario}
                revenue={revenue}
                grossProfit={grossProfit}
                marketingSpend={marketingSpend}
                eventsRevenue={eventsRevenue}
                netProfit={netProfit}
              />
            ))}
          </div>

          <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Scenario Comparison</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 13 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="Revenue" fill="#c9973a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gross Profit" fill="#2e6b52" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Net Profit" fill="#d4849b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-accent/30 border border-accent-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Base (Expected): </span>
              {fmt(baseRevenue)} revenue · {fmt(baseGrossProfit)} gross profit · All multipliers at 1.0
            </p>
          </div>
        </>
      )}
    </div>
  );
}
