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
  };
  revenue: { productCents: number; eventCents: number; totalCents: number };
  /** Cost of goods actually sold this year, from unit costs × units sold. */
  estimatedCogsCents: number;
}

const yearBounds = (year: string) => ({ start: `${year}-01-01`, end: `${year}-12-31` });

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
    },
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
    const header = ["Date", "Item", "Vendor", "Quantity", "Unit Cost", "Shipping", "Tax", "Total", "Receipt", "Notes"];
    const lines = rows.map((r) => [
      r.purchasedOn,
      r.itemName,
      r.vendor ?? "",
      r.quantity,
      money(r.unitCostCents),
      money(r.shippingCents),
      money(r.taxCents),
      money(r.totalCents),
      r.receiptRef ?? "",
      r.notes ?? "",
    ]);
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
    ["INVENTORY PURCHASED FOR RESALE (Schedule C Part III)"],
    ["Purchases", s.inventory.purchaseCount],
    ["Units", s.inventory.unitsPurchased],
    ["Total cost", money(s.inventory.totalCents)],
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
