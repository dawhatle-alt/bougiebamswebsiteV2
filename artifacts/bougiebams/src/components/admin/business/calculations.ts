import type { BusinessAssumptions, BusinessEvent, KPI, MarketingChannel, Product, Scenario, InventoryItem } from "./types";

// ─── Product-level calculations ────────────────────────────────────────────

export interface ProductMetrics {
  id: string;
  name: string;
  msrp: number;
  unitCost: number;
  unitsSold: number;
  inventoryOnHand: number;
  inventoryValue: number;
  revenue: number;
  grossProfit: number;
  grossMargin: number;
  notes: string;
}

export function calcProductMetrics(product: Product, assumptions: BusinessAssumptions): ProductMetrics {
  const msrp = product.getMSRP(assumptions);
  const unitCost = product.getUnitCost(assumptions);
  const unitsSold = product.getUnitsSold(assumptions);
  const revenue = msrp * unitsSold;
  const grossProfit = (msrp - unitCost) * unitsSold;
  const grossMargin = msrp > 0 ? ((msrp - unitCost) / msrp) * 100 : 0;
  const inventoryValue = product.inventoryOnHand * unitCost;
  return {
    id: product.id,
    name: product.name,
    msrp,
    unitCost,
    unitsSold,
    inventoryOnHand: product.inventoryOnHand,
    inventoryValue,
    revenue,
    grossProfit,
    grossMargin,
    notes: product.notes,
  };
}

export function calcAllProductMetrics(products: Product[], assumptions: BusinessAssumptions): ProductMetrics[] {
  return products.map((p) => calcProductMetrics(p, assumptions));
}

export interface ProductTotals {
  unitsSold: number;
  revenue: number;
  grossProfit: number;
  grossMargin: number;
  inventoryValue: number;
}

export function calcProductTotals(metrics: ProductMetrics[]): ProductTotals {
  const unitsSold = metrics.reduce((s, m) => s + m.unitsSold, 0);
  const revenue = metrics.reduce((s, m) => s + m.revenue, 0);
  const grossProfit = metrics.reduce((s, m) => s + m.grossProfit, 0);
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const inventoryValue = metrics.reduce((s, m) => s + m.inventoryValue, 0);
  return { unitsSold, revenue, grossProfit, grossMargin, inventoryValue };
}

// ─── Business-level calculations ───────────────────────────────────────────

export function calcRevenue(assumptions: BusinessAssumptions): number {
  return (
    (assumptions.tileSetMSRP * assumptions.tileSetUnitsTarget) +
    (assumptions.matMSRP * assumptions.matUnitsTarget) +
    (assumptions.luxuryBoxMSRP * assumptions.luxuryBoxUnitsTarget) +
    (assumptions.rackSetMSRP * assumptions.rackSetUnitsTarget)
  );
}

export function calcCOGS(assumptions: BusinessAssumptions): number {
  return (
    (assumptions.tileSetCostAt200 * assumptions.tileSetUnitsTarget) +
    (assumptions.matCost * assumptions.matUnitsTarget) +
    (assumptions.luxuryBoxCost * assumptions.luxuryBoxUnitsTarget) +
    (assumptions.rackSetCost * assumptions.rackSetUnitsTarget)
  );
}

export function calcGrossProfit(assumptions: BusinessAssumptions): number {
  return calcRevenue(assumptions) - calcCOGS(assumptions);
}

export function calcGrossMargin(assumptions: BusinessAssumptions): number {
  const rev = calcRevenue(assumptions);
  if (rev === 0) return 0;
  return (calcGrossProfit(assumptions) / rev) * 100;
}

export function calcBreakEvenUnits(assumptions: BusinessAssumptions): number {
  const fixedCosts = assumptions.laserEquipmentCost + assumptions.yearOneMarketingBudget;
  const avgUnitMargin = (
    (assumptions.tileSetMSRP - assumptions.tileSetCostAt200) +
    (assumptions.matMSRP - assumptions.matCost) +
    (assumptions.luxuryBoxMSRP - assumptions.luxuryBoxCost) +
    (assumptions.rackSetMSRP - assumptions.rackSetCost)
  ) / 4;
  if (avgUnitMargin <= 0) return Infinity;
  return fixedCosts / avgUnitMargin;
}

export function calcStartupCapitalUsed(assumptions: BusinessAssumptions): number {
  const initialInventoryInvestment =
    (assumptions.tileSetCostAt100 * 100) +
    (assumptions.matCost * 100) +
    (assumptions.luxuryBoxCost * 100) +
    (assumptions.rackSetCost * 50);
  return assumptions.laserEquipmentCost + assumptions.yearOneMarketingBudget + initialInventoryInvestment;
}

export function calcStartupCapitalRemaining(assumptions: BusinessAssumptions): number {
  return assumptions.startupCapital - calcStartupCapitalUsed(assumptions);
}

export function calcEventTicketRevenue(event: BusinessEvent): number {
  // Store events carry real revenue (paid registrations × price); manual
  // planning events estimate it from attendees × ticket price.
  return event.revenue ?? event.attendees * event.ticketPrice;
}

export function calcEventNetProfit(event: BusinessEvent): number {
  return calcEventTicketRevenue(event) - (event.attendees * event.venueCostPerAttendee) - event.otherExpenses;
}

export function calcEventRevenue(events: BusinessEvent[]): number {
  return events.reduce((sum, e) => sum + calcEventNetProfit(e), 0);
}

export function calcEventProfitPerEvent(assumptions: BusinessAssumptions): number {
  return (
    (assumptions.avgAttendees * assumptions.avgTicketPrice) -
    (assumptions.avgAttendees * assumptions.avgVenueCostPerAttendee)
  );
}

export function calcCAC(channel: MarketingChannel): number {
  if (channel.customers === 0) return 0;
  return channel.spend / channel.customers;
}

export function calcROAS(channel: MarketingChannel): number {
  if (channel.spend === 0) return 0;
  return channel.revenueInfluenced / channel.spend;
}

export function calcInventoryReorderCash(item: InventoryItem, unitCost: number): number {
  return item.reorderQty * unitCost;
}

export function calcScenarioRevenue(assumptions: BusinessAssumptions, scenario: Scenario): number {
  return calcRevenue(assumptions) * scenario.unitsSoldMultiplier;
}

export function calcScenarioNetProfit(assumptions: BusinessAssumptions, scenario: Scenario): number {
  const revenue = calcScenarioRevenue(assumptions, scenario);
  const cogs = calcCOGS(assumptions) * scenario.unitsSoldMultiplier;
  const marketing = assumptions.yearOneMarketingBudget * scenario.marketingSpendMultiplier;
  const fixedCosts = assumptions.laserEquipmentCost;
  const eventsProfit = scenario.eventCount * calcEventProfitPerEvent(assumptions);
  return revenue - cogs - marketing - fixedCosts + eventsProfit;
}

// ─── Dashboard KPI builder ──────────────────────────────────────────────────

export function buildDashboardKPIs(assumptions: BusinessAssumptions, events: BusinessEvent[], inventoryValue: number): KPI[] {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const fmtPct = (n: number) => n.toFixed(1) + "%";

  const revenue = calcRevenue(assumptions);
  const grossProfit = calcGrossProfit(assumptions);
  const grossMargin = calcGrossMargin(assumptions);
  const eventRevenue = calcEventRevenue(events);
  const capitalUsed = calcStartupCapitalUsed(assumptions);
  const capitalRemaining = calcStartupCapitalRemaining(assumptions);
  const breakEvenUnits = calcBreakEvenUnits(assumptions);
  const profitPerEvent = calcEventProfitPerEvent(assumptions);
  const totalUnitsTarget =
    assumptions.tileSetUnitsTarget +
    assumptions.matUnitsTarget +
    assumptions.luxuryBoxUnitsTarget +
    assumptions.rackSetUnitsTarget;

  return [
    { label: "Total Projected Revenue", value: fmt(revenue), note: "Products + events" },
    { label: "Gross Profit", value: fmt(grossProfit), note: "Before marketing & ops" },
    { label: "Gross Margin", value: fmtPct(grossMargin), note: "Product mix" },
    { label: "Avg Event Net Profit", value: fmt(profitPerEvent), note: "Per event" },
    { label: "Year 1 Events", value: assumptions.eventsPerYear.toString(), note: "Planned" },
    { label: "Break-Even Units", value: Math.round(breakEvenUnits).toLocaleString(), note: "Total across all SKUs" },
    { label: "Startup Capital", value: fmt(assumptions.startupCapital), note: "Initial" },
    { label: "Remaining Capital", value: fmt(capitalRemaining), note: "After initial deployment" },
    { label: "Event Revenue", value: fmt(eventRevenue), note: "Net event profit" },
    { label: "Capital Used", value: fmt(capitalUsed), note: "Equipment + inventory + mktg" },
    { label: "Inventory Value", value: fmt(inventoryValue), note: "On-hand at cost" },
    { label: "Marketing Budget", value: fmt(assumptions.yearOneMarketingBudget), note: "Year 1 planned" },
    { label: "Total Units Target", value: totalUnitsTarget.toLocaleString(), note: "All SKUs combined" },
  ];
}
