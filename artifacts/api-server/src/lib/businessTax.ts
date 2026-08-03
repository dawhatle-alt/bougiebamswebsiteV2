import { sql, eq, and, gte, lte } from "drizzle-orm";
import {
  db,
  bizExpensesTable,
  bizMileageTable,
  bizInventoryPurchasesTable,
  siteSettingsTable,
} from "@workspace/db";
import { ensureExpensesTable, ensureTaxTables } from "./businessBootstrap";
import { TAX_CATEGORIES, taxCategory } from "./taxCategories";
import { computeActuals } from "./businessActuals";

// Year-end tax summary: deductible spending by Schedule C line, the mileage
// deduction, and inventory bought for resale. Everything here is a record of
// what the owner entered — it computes totals, it does not give tax advice.

/** The IRS standard mileage rate changes every year, so it's a setting rather
 * than a constant. Zero until the owner enters the current year's rate. */
export async function getMileageRateCents(year: string): Promise<number> {
  const keys = [`mileage_rate_cents_${year}`, "mileage_rate_cents"];
  for (const key of keys) {
    try {
      const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
      const n = Number(row?.value);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      // fall through
    }
  }
  return 0;
}

export interface TaxSummary {
  year: string;
  expenses: {
    byCategory: {
      key: string;
      label: string;
      scheduleC: string;
      deductiblePct: number;
      totalCents: number;
      deductibleCents: number;
      count: number;
    }[];
    totalCents: number;
    deductibleCents: number;
    missingReceipts: number;
  };
  mileage: {
    trips: number;
    miles: number;
    rateCents: number;
    deductionCents: number;
    rateConfigured: boolean;
  };
  inventory: {
    purchaseCount: number;
    unitsPurchased: number;
    totalCents: number;
    /** Split by what the stock is for — each is deducted differently. */
    byPurpose: { purpose: string; label: string; treatment: string; units: number; totalCents: number }[];
  };
  /** Durable kit owned for events, rolled up by item across all years. */
  eventKit: { itemName: string; units: number; totalCents: number; lastPurchased: string }[];
  revenue: { productCents: number; eventCents: number; totalCents: number };
  /** Cost of goods actually sold this year, from unit costs × units sold. */
  estimatedCogsCents: number;
}

const yearBounds = (year: string) => ({ start: `${year}-01-01`, end: `${year}-12-31` });

/** What purchased stock is for. The tax treatment differs for each, which is
 * why event kit and giveaways can't just be logged as resale inventory. */
export const PURPOSES = [
  {
    key: "resale",
    label: "For resale",
    treatment: "Cost of goods sold (Schedule C Part III) — deducted as items sell.",
  },
  {
    key: "event-equipment",
    label: "Event kit (reused)",
    treatment: "Equipment you keep and reuse — Line 13/22 depending on cost and useful life. Ask your accountant about Section 179.",
  },
  {
    key: "giveaway",
    label: "Giveaways & prizes",
    treatment: "Promotional items handed out — advertising expense (Line 8) in the year given.",
  },
] as const;

export const isPurpose = (k: string): boolean => PURPOSES.some((p) => p.key === k);

/** Everything owned for events, across every year — the "what do we own and
 * what did it cost" view that a single year's ledger can't answer. */
export async function eventKitRollup(): Promise<
  { itemName: string; units: number; totalCents: number; lastPurchased: string }[]
> {
  await ensureTaxTables();
  const rows = await db
    .select()
    .from(bizInventoryPurchasesTable)
    .where(sql`coalesce(${bizInventoryPurchasesTable.purpose}, 'resale') <> 'resale'`);
  const byItem = new Map<string, { itemName: string; units: number; totalCents: number; lastPurchased: string }>();
  for (const r of rows) {
    const key = r.itemName.trim().toLowerCase();
    const entry = byItem.get(key) ?? { itemName: r.itemName, units: 0, totalCents: 0, lastPurchased: "" };
    entry.units += r.quantity;
    entry.totalCents += r.totalCents;
    if (r.purchasedOn > entry.lastPurchased) entry.lastPurchased = r.purchasedOn;
    byItem.set(key, entry);
  }
  return [...byItem.values()].sort((a, b) => b.totalCents - a.totalCents);
}

export async function computeTaxSummary(year: string): Promise<TaxSummary> {
  await ensureExpensesTable();
  await ensureTaxTables();
  const { start, end } = yearBounds(year);

  // Sequential queries (transaction pooler).
  // spent_on is the tax date; older rows only have month, so fall back to it.
  const expenses = await db
    .select()
    .from(bizExpensesTable)
    .where(
      sql`coalesce(${bizExpensesTable.spentOn}::text, ${bizExpensesTable.month} || '-01') BETWEEN ${start} AND ${end}`,
    );
  const mileage = await db
    .select()
    .from(bizMileageTable)
    .where(and(gte(bizMileageTable.drivenOn, start), lte(bizMileageTable.drivenOn, end)));
  const purchases = await db
    .select()
    .from(bizInventoryPurchasesTable)
    .where(
      and(gte(bizInventoryPurchasesTable.purchasedOn, start), lte(bizInventoryPurchasesTable.purchasedOn, end)),
    );
  const actuals = await computeActuals();
  const rateCents = await getMileageRateCents(year);

  const byCategoryMap = new Map<string, { totalCents: number; count: number }>();
  let missingReceipts = 0;
  for (const e of expenses) {
    const entry = byCategoryMap.get(e.category) ?? { totalCents: 0, count: 0 };
    entry.totalCents += e.amountCents;
    entry.count += 1;
    byCategoryMap.set(e.category, entry);
    if (!e.receiptRef?.trim()) missingReceipts += 1;
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([key, v]) => {
      const cat = taxCategory(key);
      return {
        key,
        label: cat.label,
        scheduleC: cat.scheduleC,
        deductiblePct: cat.deductiblePct,
        totalCents: v.totalCents,
        deductibleCents: Math.round((v.totalCents * cat.deductiblePct) / 100),
        count: v.count,
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents);

  const totalCents = byCategory.reduce((s, c) => s + c.totalCents, 0);
  const deductibleCents = byCategory.reduce((s, c) => s + c.deductibleCents, 0);

  const miles = mileage.reduce((s, m) => s + Number(m.miles) * (m.roundTrip ? 2 : 1), 0);

  // Revenue for the year, from the monthly actuals buckets.
  let productCents = 0;
  let eventCents = 0;
  for (const m of actuals.monthly) {
    if (m.month.startsWith(year)) {
      productCents += m.productCents;
      eventCents += m.eventCents;
    }
  }

  return {
    year,
    expenses: { byCategory, totalCents, deductibleCents, missingReceipts },
    mileage: {
      trips: mileage.length,
      miles: Math.round(miles * 10) / 10,
      rateCents,
      deductionCents: Math.round(miles * rateCents),
      rateConfigured: rateCents > 0,
    },
    inventory: {
      purchaseCount: purchases.length,
      unitsPurchased: purchases.reduce((s, p) => s + p.quantity, 0),
      totalCents: purchases.reduce((s, p) => s + p.totalCents, 0),
      byPurpose: PURPOSES.map((def) => {
        const rows = purchases.filter((p) => (p.purpose ?? "resale") === def.key);
        return {
          purpose: def.key,
          label: def.label,
          treatment: def.treatment,
          units: rows.reduce((s, p) => s + p.quantity, 0),
          totalCents: rows.reduce((s, p) => s + p.totalCents, 0),
        };
      }).filter((p) => p.units > 0 || p.totalCents > 0),
    },
    eventKit: await eventKitRollup(),
    revenue: { productCents, eventCents, totalCents: productCents + eventCents },
    estimatedCogsCents: 0,
  };
}

const csvEsc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const money = (cents: number) => (cents / 100).toFixed(2);

/** One CSV per ledger, for the accountant. */
export async function taxCsv(year: string, type: "expenses" | "mileage" | "inventory" | "summary"): Promise<string> {
  await ensureExpensesTable();
  await ensureTaxTables();
  const { start, end } = yearBounds(year);

  if (type === "expenses") {
    const rows = await db
      .select()
      .from(bizExpensesTable)
      .where(
        sql`coalesce(${bizExpensesTable.spentOn}::text, ${bizExpensesTable.month} || '-01') BETWEEN ${start} AND ${end}`,
      );
    const header = ["Date", "Category", "Schedule C", "Deductible %", "Description", "Vendor", "Payment Method", "Amount", "Deductible Amount", "Receipt", "Notes"];
    const lines = rows
      .map((r) => {
        const cat = taxCategory(r.category);
        return [
          r.spentOn ?? `${r.month}-01`,
          cat.label,
          cat.scheduleC,
          cat.deductiblePct,
          r.description,
          r.vendor ?? "",
          r.paymentMethod ?? "",
          money(r.amountCents),
          money(Math.round((r.amountCents * cat.deductiblePct) / 100)),
          r.receiptRef ?? "",
          r.notes ?? "",
        ];
      })
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    return [header, ...lines].map((l) => l.map(csvEsc).join(",")).join("\n");
  }

  if (type === "mileage") {
    const rows = await db
      .select()
      .from(bizMileageTable)
      .where(and(gte(bizMileageTable.drivenOn, start), lte(bizMileageTable.drivenOn, end)))
      .orderBy(bizMileageTable.drivenOn);
    const rate = await getMileageRateCents(year);
    const header = ["Date", "Purpose", "From", "To", "Miles (one way)", "Round Trip", "Total Miles", "Rate", "Deduction", "Notes"];
    const lines = rows.map((r) => {
      const total = Number(r.miles) * (r.roundTrip ? 2 : 1);
      return [
        r.drivenOn,
        r.purpose,
        r.fromLocation ?? "",
        r.toLocation ?? "",
        Number(r.miles),
        r.roundTrip ? "Yes" : "No",
        total,
        (rate / 100).toFixed(3),
        money(Math.round(total * rate)),
        r.notes ?? "",
      ];
    });
    return [header, ...lines].map((l) => l.map(csvEsc).join(",")).join("\n");
  }

  if (type === "inventory") {
    const rows = await db
      .select()
      .from(bizInventoryPurchasesTable)
      .where(and(gte(bizInventoryPurchasesTable.purchasedOn, start), lte(bizInventoryPurchasesTable.purchasedOn, end)))
      .orderBy(bizInventoryPurchasesTable.purchasedOn);
    const header = ["Date", "Purpose", "Tax Treatment", "Item", "Vendor", "Quantity", "Unit Cost", "Shipping", "Tax", "Total", "Receipt", "Notes"];
    const lines = rows.map((r) => {
      const def = PURPOSES.find((p) => p.key === (r.purpose ?? "resale")) ?? PURPOSES[0];
      return [
        r.purchasedOn,
        def.label,
        def.treatment,
        r.itemName,
        r.vendor ?? "",
        r.quantity,
        money(r.unitCostCents),
        money(r.shippingCents),
        money(r.taxCents),
        money(r.totalCents),
        r.receiptRef ?? "",
        r.notes ?? "",
      ];
    });
    return [header, ...lines].map((l) => l.map(csvEsc).join(",")).join("\n");
  }

  // summary
  const s = await computeTaxSummary(year);
  const lines: (string | number)[][] = [
    [`BougieBams ${year} tax summary`],
    ["Generated for your accountant — figures come from records entered in Business HQ."],
    [],
    ["INCOME"],
    ["Product sales", money(s.revenue.productCents)],
    ["Event ticket sales", money(s.revenue.eventCents)],
    ["Total revenue", money(s.revenue.totalCents)],
    [],
    ["STOCK PURCHASED — each line is deducted differently"],
    ["Purpose", "Treatment", "Units", "Total cost"],
    ...s.inventory.byPurpose.map((p) => [p.label, p.treatment, p.units, money(p.totalCents)]),
    ["Total", "", s.inventory.unitsPurchased, money(s.inventory.totalCents)],
    [],
    ["EVENT KIT OWNED (all years, non-resale purchases)"],
    ["Item", "Units", "Total cost", "Last purchased"],
    ...s.eventKit.map((k) => [k.itemName, k.units, money(k.totalCents), k.lastPurchased]),
    [],
    ["EXPENSES BY SCHEDULE C LINE"],
    ["Category", "Schedule C", "Entries", "Amount", "Deductible %", "Deductible Amount"],
    ...s.expenses.byCategory.map((c) => [
      c.label, c.scheduleC, c.count, money(c.totalCents), c.deductiblePct, money(c.deductibleCents),
    ]),
    ["Total", "", "", money(s.expenses.totalCents), "", money(s.expenses.deductibleCents)],
    [],
    ["VEHICLE — STANDARD MILEAGE (Schedule C Line 9)"],
    ["Trips logged", s.mileage.trips],
    ["Total business miles", s.mileage.miles],
    ["Rate per mile", s.mileage.rateConfigured ? (s.mileage.rateCents / 100).toFixed(3) : "NOT SET"],
    ["Mileage deduction", s.mileage.rateConfigured ? money(s.mileage.deductionCents) : "set the rate to compute"],
    [],
    ["NOTES"],
    ["Expenses missing a receipt reference", s.expenses.missingReceipts],
    ["This summary is a record of entered data, not tax advice. Confirm treatment with your accountant."],
  ];
  return lines.map((l) => l.map(csvEsc).join(",")).join("\n");
}
