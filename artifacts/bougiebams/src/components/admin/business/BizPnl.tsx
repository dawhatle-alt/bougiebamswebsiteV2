import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, X, Download, CopyPlus, Loader2 } from "lucide-react";
import { bizFetch, bizJson } from "./api";

// Monthly P&L: revenue and COGS are computed from real orders, registrations,
// unit costs and event costs; operating expenses come from the owner-entered
// ledger below the statement.

export const EXPENSE_CATEGORIES: { key: string; label: string }[] = [
  { key: "processing-fees", label: "Processing Fees" },
  { key: "software", label: "Software & Tools" },
  { key: "marketing", label: "Marketing" },
  { key: "shipping-supplies", label: "Shipping & Supplies" },
  { key: "travel", label: "Travel" },
  { key: "event-fees", label: "Event Fees" },
  { key: "event-food", label: "Event Food & Beverage" },
  { key: "insurance", label: "Insurance" },
  { key: "other", label: "Other" },
];
const categoryLabel = (key: string) => EXPENSE_CATEGORIES.find((c) => c.key === key)?.label ?? key;

interface PnlStatement {
  month: string;
  revenue: { productCents: number; eventCents: number; totalCents: number; productOrders: number; paidSeats: number };
  cogs: {
    productCogsCents: number;
    unmatchedUnits: number;
    eventCostsCents: number;
    eventCostEvents: { title: string; cents: number }[];
    totalCents: number;
  };
  grossProfitCents: number;
  expenses: {
    feesCents: number;
    feesSource: "estimated" | "manual";
    rows: { id: number; category: string; description: string; amountCents: number }[];
    byCategory: { category: string; cents: number }[];
    totalCents: number;
  };
  netProfitCents: number;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function StatementRow({
  label,
  cents,
  prior,
  bold,
  indent,
  note,
  signed,
}: {
  label: string;
  cents: number;
  prior?: number;
  bold?: boolean;
  indent?: boolean;
  note?: string;
  signed?: boolean;
}) {
  const color = signed ? (cents >= 0 ? "text-green-700" : "text-destructive") : "text-foreground";
  return (
    <tr className={bold ? "border-t border-border bg-muted/30" : ""}>
      <td className={`py-2 pr-4 ${indent ? "pl-6" : "pl-2"} ${bold ? "font-bold" : "font-medium"} text-foreground`}>
        {label}
        {note && <span className="ml-2 text-xs font-normal text-muted-foreground">{note}</span>}
      </td>
      <td className={`py-2 pr-2 text-right tabular-nums ${bold ? "font-bold" : ""} ${color}`}>{fmt(cents)}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground text-sm">
        {prior != null ? fmt(prior) : ""}
      </td>
    </tr>
  );
}

export default function BizPnl() {
  const qc = useQueryClient();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth);
  const [form, setForm] = useState({ category: "software", description: "", amount: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["biz-pnl", month],
    queryFn: () => bizJson<{ current: PnlStatement; prior: PnlStatement }>(`/pnl?month=${month}`),
    retry: 1,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["biz-pnl"] });

  const addMutation = useMutation({
    mutationFn: (body: { month: string; category: string; description: string; amountCents: number }) =>
      bizJson("/expenses", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setForm((f) => ({ ...f, description: "", amount: "" }));
      invalidate();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await bizFetch(`/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: invalidate,
  });
  const copyMutation = useMutation({
    mutationFn: () => bizJson<{ copied: number }>("/expenses/copy-previous", { method: "POST", body: JSON.stringify({ month }) }),
    onSuccess: invalidate,
  });

  const handleAdd = () => {
    const amountCents = Math.round(parseFloat(form.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 0) return;
    addMutation.mutate({ month, category: form.category, description: form.description.trim(), amountCents });
  };

  const exportCsv = () => {
    if (!data) return;
    const s = data.current;
    const lines: string[][] = [
      ["BougieBams P&L", monthLabel(s.month)],
      [],
      ["Revenue"],
      ["Product sales", (s.revenue.productCents / 100).toFixed(2)],
      ["Event tickets", (s.revenue.eventCents / 100).toFixed(2)],
      ["Total revenue", (s.revenue.totalCents / 100).toFixed(2)],
      [],
      ["Cost of goods & event costs"],
      ["Product costs", (s.cogs.productCogsCents / 100).toFixed(2)],
      ...s.cogs.eventCostEvents.map((e) => [`Event costs — ${e.title}`, (e.cents / 100).toFixed(2)]),
      ["Total COGS", (s.cogs.totalCents / 100).toFixed(2)],
      [],
      ["Gross profit", (s.grossProfitCents / 100).toFixed(2)],
      [],
      ["Operating expenses"],
      ...s.expenses.byCategory.map((c) => [
        categoryLabel(c.category) + (c.category === "processing-fees" && s.expenses.feesSource === "estimated" ? " (estimated)" : ""),
        (c.cents / 100).toFixed(2),
      ]),
      ["Total operating expenses", (s.expenses.totalCents / 100).toFixed(2)],
      [],
      ["Net profit", (s.netProfitCents / 100).toFixed(2)],
      [],
      ["Expense detail"],
      ["Category", "Description", "Amount"],
      ...s.expenses.rows.map((r) => [categoryLabel(r.category), r.description, (r.amountCents / 100).toFixed(2)]),
    ];
    const csv = lines.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnl-${s.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = data?.current;
  const p = data?.prior;
  const grossMargin = s && s.revenue.totalCents > 0 ? (s.grossProfitCents / s.revenue.totalCents) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Profit & Loss</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cash-basis monthly statement from real sales — reconcile the revenue line against your Square dashboard, then enter the month's expenses below
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-foreground min-w-[9rem] text-center">{monthLabel(month)}</span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= currentMonth}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={exportCsv}
            disabled={!data}
            className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      {isLoading || !s ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-card border border-card-border rounded-xl shadow-sm p-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[28rem]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 pl-2">Line</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 pr-2">{monthLabel(month)}</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 pr-2">{monthLabel(shiftMonth(month, -1))}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <StatementRow label="Product sales" note={`${s.revenue.productOrders} orders`} cents={s.revenue.productCents} prior={p?.revenue.productCents} indent />
                <StatementRow label="Event tickets" note={`${s.revenue.paidSeats} paid seats`} cents={s.revenue.eventCents} prior={p?.revenue.eventCents} indent />
                <StatementRow label="Total Revenue" cents={s.revenue.totalCents} prior={p?.revenue.totalCents} bold />
                <StatementRow
                  label="Product costs"
                  note={s.cogs.unmatchedUnits > 0 ? `${s.cogs.unmatchedUnits} units missing a Unit Cost` : undefined}
                  cents={s.cogs.productCogsCents}
                  prior={p?.cogs.productCogsCents}
                  indent
                />
                <StatementRow
                  label="Event costs"
                  note={s.cogs.eventCostEvents.map((e) => e.title).join(", ") || undefined}
                  cents={s.cogs.eventCostsCents}
                  prior={p?.cogs.eventCostsCents}
                  indent
                />
                <StatementRow label="Gross Profit" note={grossMargin != null ? `${grossMargin.toFixed(1)}% margin` : undefined} cents={s.grossProfitCents} prior={p?.grossProfitCents} bold signed />
                {s.expenses.byCategory.map((c) => (
                  <StatementRow
                    key={c.category}
                    label={categoryLabel(c.category)}
                    note={c.category === "processing-fees" && s.expenses.feesSource === "estimated" ? "estimated at 2.9% + 30¢" : undefined}
                    cents={c.cents}
                    prior={p?.expenses.byCategory.find((x) => x.category === c.category)?.cents}
                    indent
                  />
                ))}
                <StatementRow label="Total Operating Expenses" cents={s.expenses.totalCents} prior={p?.expenses.totalCents} bold />
                <StatementRow label="Net Profit" cents={s.netProfitCents} prior={p?.netProfitCents} bold signed />
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-card-border rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Expenses — {monthLabel(month)}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Venue costs entered on the Events ROI tab already count as Event costs above — use Event Fees / Food for spending you don't track per event.
                </p>
              </div>
              <button
                onClick={() => copyMutation.mutate()}
                disabled={copyMutation.isPending}
                className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
                title="Copy last month's recurring expenses (skips processing fees and duplicates)"
              >
                <CopyPlus size={13} />
                {copyMutation.isPending ? "Copying…" : "Copy last month's recurring"}
              </button>
            </div>

            <div className="px-5 py-3 flex flex-wrap items-end gap-2 border-b border-border/60">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="bg-input/60 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[10rem]">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Vercel subscription"
                  className="bg-input/60 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Amount ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="bg-input/60 border border-border rounded-lg px-2 py-1.5 text-sm text-right tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={addMutation.isPending || form.amount === ""}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {s.expenses.rows.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">
                No expenses entered for this month yet{s.expenses.feesSource === "estimated" && s.expenses.feesCents > 0 ? " — processing fees are being estimated; add a Processing Fees row with the real total from Square to replace the estimate" : ""}.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/40">
                  {s.expenses.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-5 py-2 font-medium text-foreground whitespace-nowrap">{categoryLabel(r.category)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.description}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-foreground">{fmt(r.amountCents)}</td>
                      <td className="pr-4 py-2 w-8">
                        <button
                          onClick={() => deleteMutation.mutate(r.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete expense"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
