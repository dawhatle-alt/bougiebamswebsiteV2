import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, X, Download, Car, Package, Receipt, AlertTriangle } from "lucide-react";
import { bizFetch, bizJson } from "./api";

// Tax records: dated expenses, business mileage, and inventory bought for
// resale — the three ledgers an accountant asks for at year end. Everything
// here records what the owner enters; none of it is tax advice.

interface TaxCategoryDef {
  key: string;
  label: string;
  scheduleC: string;
  deductiblePct: number;
  hint?: string;
}

interface TaxSummary {
  year: string;
  expenses: {
    byCategory: { key: string; label: string; scheduleC: string; deductiblePct: number; totalCents: number; deductibleCents: number; count: number }[];
    totalCents: number;
    deductibleCents: number;
    missingReceipts: number;
  };
  mileage: { trips: number; miles: number; rateCents: number; deductionCents: number; rateConfigured: boolean };
  inventory: {
    purchaseCount: number;
    unitsPurchased: number;
    totalCents: number;
    byPurpose: { purpose: string; label: string; treatment: string; units: number; totalCents: number }[];
  };
  eventKit: { itemName: string; units: number; totalCents: number; lastPurchased: string }[];
  revenue: { productCents: number; eventCents: number; totalCents: number };
}

interface PurposeDef { key: string; label: string; treatment: string }

interface Trip {
  id: number;
  drivenOn: string;
  purpose: string;
  fromLocation: string | null;
  toLocation: string | null;
  miles: number;
  roundTrip: boolean;
  notes: string | null;
}

interface Purchase {
  id: number;
  purchasedOn: string;
  purpose: string;
  itemName: string;
  vendor: string | null;
  quantity: number;
  unitCostCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function BizTaxCenter() {
  const thisYear = String(new Date().getFullYear());
  const [year, setYear] = useState(thisYear);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [categories, setCategories] = useState<TaxCategoryDef[]>([]);
  const [purposes, setPurposes] = useState<PurposeDef[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    spentOn: todayISO(), category: "supplies", description: "", amount: "", vendor: "", paymentMethod: "", receiptRef: "",
  });
  const [tripForm, setTripForm] = useState({
    drivenOn: todayISO(), purpose: "", fromLocation: "", toLocation: "", miles: "", roundTrip: true,
  });
  const [purchaseForm, setPurchaseForm] = useState({
    purchasedOn: todayISO(), purpose: "event-equipment", itemName: "", vendor: "", quantity: "1", unitCost: "", shipping: "", tax: "",
  });
  const [rateInput, setRateInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = await bizJson<{ summary: TaxSummary; categories: TaxCategoryDef[]; purposes: PurposeDef[] }>(`/tax-summary?year=${year}`);
      setSummary(s.summary);
      setCategories(s.categories);
      setPurposes(s.purposes ?? []);
      setRateInput(s.summary.mileage.rateConfigured ? (s.summary.mileage.rateCents / 100).toFixed(3) : "");
      const m = await bizJson<{ trips: Trip[] }>(`/mileage?year=${year}`);
      setTrips(m.trips ?? []);
      const p = await bizJson<{ purchases: Purchase[] }>(`/inventory-purchases?year=${year}`);
      setPurchases(p.purchases ?? []);
    } catch {
      setError("Could not load tax records.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { void load(); }, [load]);

  async function post(path: string, body: unknown) {
    setSaving(true);
    setError("");
    try {
      await bizJson(path, { method: "POST", body: JSON.stringify(body) });
      await load();
      return true;
    } catch {
      setError("Could not save that. Check the values and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(path: string) {
    const res = await bizFetch(path, { method: "DELETE" });
    if (res.ok) await load();
  }

  const addExpense = async () => {
    const cents = Math.round(parseFloat(expenseForm.amount) * 100);
    if (!Number.isFinite(cents) || cents < 0) return;
    const ok = await post("/expenses", {
      spentOn: expenseForm.spentOn,
      category: expenseForm.category,
      description: expenseForm.description.trim(),
      amountCents: cents,
      vendor: expenseForm.vendor.trim() || undefined,
      paymentMethod: expenseForm.paymentMethod.trim() || undefined,
      receiptRef: expenseForm.receiptRef.trim() || undefined,
    });
    if (ok) setExpenseForm((f) => ({ ...f, description: "", amount: "", vendor: "", receiptRef: "" }));
  };

  const addTrip = async () => {
    const miles = parseFloat(tripForm.miles);
    if (!Number.isFinite(miles) || miles <= 0) return;
    const ok = await post("/mileage", {
      drivenOn: tripForm.drivenOn,
      purpose: tripForm.purpose.trim() || "Business trip",
      fromLocation: tripForm.fromLocation.trim() || undefined,
      toLocation: tripForm.toLocation.trim() || undefined,
      miles,
      roundTrip: tripForm.roundTrip,
    });
    if (ok) setTripForm((f) => ({ ...f, purpose: "", fromLocation: "", toLocation: "", miles: "" }));
  };

  const addPurchase = async () => {
    const unit = Math.round(parseFloat(purchaseForm.unitCost) * 100);
    const qty = parseInt(purchaseForm.quantity) || 1;
    if (!Number.isFinite(unit) || unit < 0 || !purchaseForm.itemName.trim()) return;
    const ok = await post("/inventory-purchases", {
      purchasedOn: purchaseForm.purchasedOn,
      purpose: purchaseForm.purpose,
      itemName: purchaseForm.itemName.trim(),
      vendor: purchaseForm.vendor.trim() || undefined,
      quantity: qty,
      unitCostCents: unit,
      shippingCents: Math.round(parseFloat(purchaseForm.shipping || "0") * 100) || 0,
      taxCents: Math.round(parseFloat(purchaseForm.tax || "0") * 100) || 0,
    });
    if (ok) setPurchaseForm((f) => ({ ...f, itemName: "", vendor: "", unitCost: "", shipping: "", tax: "" }));
  };

  const saveRate = async () => {
    const cents = Math.round(parseFloat(rateInput) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    setSaving(true);
    try {
      await bizJson("/mileage-rate", { method: "PUT", body: JSON.stringify({ year, rateCents: cents }) });
      await load();
    } catch {
      setError("Could not save the mileage rate.");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = (type: string) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${base}/api/admin/business/tax-export?year=${year}&type=${type}`, "_blank");
  };

  const years = Array.from({ length: 4 }, (_, i) => String(Number(thisYear) - i));
  const input = "bg-input/60 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const label = "text-[10px] font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tax Records</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dated expenses, business mileage, and inventory bought for resale — everything your accountant asks for, exportable as CSV.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(e.target.value)} className={input}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => exportCsv("summary")} className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-semibold hover:opacity-90">
            <Download size={14} /> Accountant packet
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading || !summary ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {/* Year at a glance */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-card-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductible expenses</div>
              <div className="text-2xl font-bold text-foreground mt-1">{fmt(summary.expenses.deductibleCents)}</div>
              <div className="text-xs text-muted-foreground">{fmt(summary.expenses.totalCents)} spent</div>
            </div>
            <div className="rounded-xl border border-card-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mileage deduction</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {summary.mileage.rateConfigured ? fmt(summary.mileage.deductionCents) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">{summary.mileage.miles} miles · {summary.mileage.trips} trips</div>
            </div>
            <div className="rounded-xl border border-card-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventory purchased</div>
              <div className="text-2xl font-bold text-foreground mt-1">{fmt(summary.inventory.totalCents)}</div>
              <div className="text-xs text-muted-foreground">{summary.inventory.unitsPurchased} units · goes in COGS</div>
            </div>
            <div className="rounded-xl border border-card-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue {year}</div>
              <div className="text-2xl font-bold text-foreground mt-1">{fmt(summary.revenue.totalCents)}</div>
              <div className="text-xs text-muted-foreground">{fmt(summary.revenue.productCents)} products · {fmt(summary.revenue.eventCents)} events</div>
            </div>
          </div>

          {summary.expenses.missingReceipts > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>{summary.expenses.missingReceipts}</strong> expense{summary.expenses.missingReceipts === 1 ? " has" : "s have"} no receipt reference.
                The IRS expects documentation for deductions — add where the receipt lives (a Drive link, a folder name, or the Square receipt number).
              </span>
            </div>
          )}

          {/* Expenses by Schedule C line */}
          <div className="bg-card border border-card-border rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Receipt size={15} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Expenses by Schedule C line</h2>
              </div>
              <button onClick={() => exportCsv("expenses")} className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60">
                <Download size={13} /> Expense CSV
              </button>
            </div>

            {/* Flex-wrap rather than a fixed column count: the fields have very
                different natural widths, and a rigid grid stretched some while
                stranding the button. */}
            <div className="px-5 py-3 flex flex-wrap items-end gap-2 border-b border-border/60">
              <div className="flex flex-col gap-1 w-[9.5rem]">
                <label className={label}>Date</label>
                <input type="date" value={expenseForm.spentOn} onChange={(e) => setExpenseForm((f) => ({ ...f, spentOn: e.target.value }))} className={input} />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[11rem]">
                <label className={label}>Category</label>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} className={input}>
                  {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-[2] min-w-[12rem]">
                <label className={label}>Description</label>
                <input value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} className={input} placeholder="What was it?" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[9rem]">
                <label className={label}>Vendor</label>
                <input value={expenseForm.vendor} onChange={(e) => setExpenseForm((f) => ({ ...f, vendor: e.target.value }))} className={input} placeholder="Who from" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[9rem]">
                <label className={label}>Receipt</label>
                <input value={expenseForm.receiptRef} onChange={(e) => setExpenseForm((f) => ({ ...f, receiptRef: e.target.value }))} className={input} placeholder="Link or ref" />
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className={label}>Amount</label>
                <input type="number" step={0.01} min={0} value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} className={`${input} text-right tabular-nums`} />
              </div>
              <button onClick={() => void addExpense()} disabled={saving || !expenseForm.amount} className="h-[34px] flex items-center gap-1 bg-primary text-primary-foreground rounded-lg px-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40">
                <Plus size={14} /> Add
              </button>
            </div>

            {categories.find((c) => c.key === expenseForm.category)?.hint && (
              <p className="px-5 pt-2 text-xs text-muted-foreground">
                {categories.find((c) => c.key === expenseForm.category)!.scheduleC} · {categories.find((c) => c.key === expenseForm.category)!.hint}
              </p>
            )}

            {summary.expenses.byCategory.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">No expenses recorded for {year} yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    {["Category", "Schedule C", "Entries", "Spent", "Deductible"].map((h) => (
                      <th key={h} className="px-5 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {summary.expenses.byCategory.map((c) => (
                    <tr key={c.key} className="hover:bg-muted/30">
                      <td className="px-5 py-2 font-medium text-foreground">{c.label}</td>
                      <td className="px-5 py-2 text-muted-foreground text-xs">{c.scheduleC}{c.deductiblePct !== 100 && ` · ${c.deductiblePct}% deductible`}</td>
                      <td className="px-5 py-2 tabular-nums text-muted-foreground">{c.count}</td>
                      <td className="px-5 py-2 tabular-nums text-foreground">{fmt(c.totalCents)}</td>
                      <td className="px-5 py-2 tabular-nums font-medium text-foreground">{fmt(c.deductibleCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40">
                    <td className="px-5 py-2 font-bold text-foreground" colSpan={3}>Total</td>
                    <td className="px-5 py-2 tabular-nums font-bold text-foreground">{fmt(summary.expenses.totalCents)}</td>
                    <td className="px-5 py-2 tabular-nums font-bold text-foreground">{fmt(summary.expenses.deductibleCents)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Mileage */}
          <div className="bg-card border border-card-border rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Car size={15} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Business mileage</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{year} IRS rate $/mile</span>
                <input value={rateInput} onChange={(e) => setRateInput(e.target.value)} placeholder="0.000" className={`${input} w-24 text-right tabular-nums`} />
                <button onClick={() => void saveRate()} disabled={saving} className="border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60">Save</button>
                <button onClick={() => exportCsv("mileage")} className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60">
                  <Download size={13} /> CSV
                </button>
              </div>
            </div>

            {!summary.mileage.rateConfigured && (
              <p className="px-5 pt-3 text-xs text-amber-800">
                Set the IRS standard mileage rate for {year} to compute the deduction — confirm the current figure on irs.gov or with your accountant, since it changes annually.
              </p>
            )}

            <div className="px-5 py-3 flex flex-wrap items-end gap-2 border-b border-border/60">
              <div className="flex flex-col gap-1 w-[9.5rem]">
                <label className={label}>Date</label>
                <input type="date" value={tripForm.drivenOn} onChange={(e) => setTripForm((f) => ({ ...f, drivenOn: e.target.value }))} className={input} />
              </div>
              <div className="flex flex-col gap-1 flex-[2] min-w-[12rem]">
                <label className={label}>Purpose</label>
                <input value={tripForm.purpose} onChange={(e) => setTripForm((f) => ({ ...f, purpose: e.target.value }))} className={input} placeholder="e.g. Rabbit Hole event setup" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
                <label className={label}>From</label>
                <input value={tripForm.fromLocation} onChange={(e) => setTripForm((f) => ({ ...f, fromLocation: e.target.value }))} className={input} placeholder="Home" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
                <label className={label}>To</label>
                <input value={tripForm.toLocation} onChange={(e) => setTripForm((f) => ({ ...f, toLocation: e.target.value }))} className={input} placeholder="Venue" />
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className={label}>Miles one way</label>
                <input type="number" step={0.1} min={0} value={tripForm.miles} onChange={(e) => setTripForm((f) => ({ ...f, miles: e.target.value }))} className={`${input} text-right tabular-nums`} />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer h-[34px] whitespace-nowrap">
                <input type="checkbox" checked={tripForm.roundTrip} onChange={(e) => setTripForm((f) => ({ ...f, roundTrip: e.target.checked }))} className="accent-primary" />
                Round trip
              </label>
              <button onClick={() => void addTrip()} disabled={saving || !tripForm.miles} className="h-[34px] flex items-center gap-1 bg-primary text-primary-foreground rounded-lg px-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40">
                <Plus size={14} /> Add
              </button>
            </div>

            {trips.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">No trips logged for {year}. Log each drive to and from an event — it adds up fast.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/40">
                  {trips.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30 group">
                      <td className="px-5 py-2 text-muted-foreground whitespace-nowrap">{t.drivenOn}</td>
                      <td className="px-4 py-2 text-foreground">
                        {t.purpose}
                        {(t.fromLocation || t.toLocation) && (
                          <span className="block text-xs text-muted-foreground">{t.fromLocation} → {t.toLocation}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-right text-foreground whitespace-nowrap">
                        {Number(t.miles) * (t.roundTrip ? 2 : 1)} mi
                        {t.roundTrip && <span className="text-xs text-muted-foreground"> (round trip)</span>}
                      </td>
                      <td className="pr-4 py-2 w-8">
                        <button onClick={() => void remove(`/mileage/${t.id}`)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all" title="Delete trip">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Inventory purchases */}
          <div className="bg-card border border-card-border rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Stock purchased — resale, event kit &amp; giveaways</h2>
              </div>
              <button onClick={() => exportCsv("inventory")} className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60">
                <Download size={13} /> CSV
              </button>
            </div>
            <p className="px-5 pt-3 text-xs text-muted-foreground">
              Log everything you buy as stock and mark what it's for — the three are deducted differently, so keeping them apart here is what makes the year-end numbers right.
            </p>

            <div className="px-5 py-3 flex flex-wrap items-end gap-2 border-b border-border/60">
              <div className="flex flex-col gap-1 w-[9.5rem]">
                <label className={label}>Date</label>
                <input type="date" value={purchaseForm.purchasedOn} onChange={(e) => setPurchaseForm((f) => ({ ...f, purchasedOn: e.target.value }))} className={input} />
              </div>
              <div className="flex flex-col gap-1 w-44">
                <label className={label}>What for</label>
                <select value={purchaseForm.purpose} onChange={(e) => setPurchaseForm((f) => ({ ...f, purpose: e.target.value }))} className={input}>
                  {purposes.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-[2] min-w-[12rem]">
                <label className={label}>Item</label>
                <input value={purchaseForm.itemName} onChange={(e) => setPurchaseForm((f) => ({ ...f, itemName: e.target.value }))} className={input} placeholder="e.g. Racks, winner brags" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[9rem]">
                <label className={label}>Vendor</label>
                <input value={purchaseForm.vendor} onChange={(e) => setPurchaseForm((f) => ({ ...f, vendor: e.target.value }))} className={input} />
              </div>
              <div className="flex flex-col gap-1 w-20">
                <label className={label}>Qty</label>
                <input type="number" min={1} value={purchaseForm.quantity} onChange={(e) => setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))} className={`${input} text-right tabular-nums`} />
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className={label}>Unit cost</label>
                <input type="number" step={0.01} min={0} value={purchaseForm.unitCost} onChange={(e) => setPurchaseForm((f) => ({ ...f, unitCost: e.target.value }))} className={`${input} text-right tabular-nums`} />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className={label}>Shipping</label>
                <input type="number" step={0.01} min={0} value={purchaseForm.shipping} onChange={(e) => setPurchaseForm((f) => ({ ...f, shipping: e.target.value }))} className={`${input} text-right tabular-nums`} placeholder="0" />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className={label}>Tax</label>
                <input type="number" step={0.01} min={0} value={purchaseForm.tax} onChange={(e) => setPurchaseForm((f) => ({ ...f, tax: e.target.value }))} className={`${input} text-right tabular-nums`} placeholder="0" />
              </div>
              <button onClick={() => void addPurchase()} disabled={saving || !purchaseForm.itemName || !purchaseForm.unitCost} className="h-[34px] flex items-center gap-1 bg-primary text-primary-foreground rounded-lg px-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40">
                <Plus size={14} /> Add
              </button>
            </div>

            {purposes.find((p) => p.key === purchaseForm.purpose) && (
              <p className="px-5 pt-2 text-xs text-muted-foreground">
                {purposes.find((p) => p.key === purchaseForm.purpose)!.treatment}
              </p>
            )}

            {summary.inventory.byPurpose.length > 0 && (
              <div className="px-5 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {summary.inventory.byPurpose.map((p) => (
                  <div key={p.purpose} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <div className="text-xs font-semibold text-foreground">{p.label}</div>
                    <div className="text-lg font-bold text-foreground tabular-nums">{fmt(p.totalCents)}</div>
                    <div className="text-[11px] text-muted-foreground">{p.units} units in {year}</div>
                  </div>
                ))}
              </div>
            )}

            {purchases.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">No purchases recorded for {year}.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/40">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 group">
                      <td className="px-5 py-2 text-muted-foreground whitespace-nowrap">{p.purchasedOn}</td>
                      <td className="px-4 py-2 text-foreground">
                        {p.itemName}
                        <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold align-middle">
                          {purposes.find((x) => x.key === (p.purpose ?? "resale"))?.label ?? p.purpose}
                        </span>
                        {p.vendor && <span className="block text-xs text-muted-foreground">{p.vendor}</span>}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground whitespace-nowrap">{p.quantity} × {fmt(p.unitCostCents)}</td>
                      <td className="px-4 py-2 tabular-nums font-medium text-foreground text-right whitespace-nowrap">{fmt(p.totalCents)}</td>
                      <td className="pr-4 py-2 w-8">
                        <button onClick={() => void remove(`/inventory-purchases/${p.id}`)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all" title="Delete purchase">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* What we own for events, across every year — a single year's
              ledger can't answer "how many racks do we have?" */}
          {summary.eventKit.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Package size={15} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Event kit owned</h2>
                <span className="text-xs text-muted-foreground">— all years, everything not bought for resale</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    {["Item", "Units bought", "Total spent", "Last purchased"].map((h) => (
                      <th key={h} className="px-5 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {summary.eventKit.map((k) => (
                    <tr key={k.itemName} className="hover:bg-muted/30">
                      <td className="px-5 py-2 font-medium text-foreground">{k.itemName}</td>
                      <td className="px-5 py-2 tabular-nums text-foreground">{k.units}</td>
                      <td className="px-5 py-2 tabular-nums text-foreground">{fmt(k.totalCents)}</td>
                      <td className="px-5 py-2 text-muted-foreground">{k.lastPurchased}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40">
                    <td className="px-5 py-2 font-bold text-foreground">Total</td>
                    <td className="px-5 py-2 tabular-nums font-bold text-foreground">{summary.eventKit.reduce((s, k) => s + k.units, 0)}</td>
                    <td className="px-5 py-2 tabular-nums font-bold text-foreground">{fmt(summary.eventKit.reduce((s, k) => s + k.totalCents, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <p className="px-5 py-3 text-xs text-muted-foreground">
                Counts what you've bought. Anything lost, broken or given away needs a note in the purchase entry for now — retirement tracking isn't built yet.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            These are your records, totalled — not tax advice. Category-to-Schedule-C mappings follow the published line descriptions; confirm anything unusual with your accountant.
          </p>
        </>
      )}
    </div>
  );
}
