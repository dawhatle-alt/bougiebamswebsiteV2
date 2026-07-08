import { useQuery } from "@tanstack/react-query";
import { useAssumptions } from "./AssumptionsContext";
import type { InventoryItem } from "./types";
import { calcInventoryReorderCash } from "./calculations";
import { bizJson } from "./api";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const PRODUCT_COST_MAP: Record<string, (costs: { tileSetCostAt200: number; matCost: number; luxuryBoxCost: number; rackSetCost: number }) => number> = {
  "tile-set": (c) => c.tileSetCostAt200,
  "mat": (c) => c.matCost,
  "luxury-box": (c) => c.luxuryBoxCost,
  "rack-set": (c) => c.rackSetCost,
};

async function fetchInventory(): Promise<InventoryItem[]> {
  return bizJson<InventoryItem[]>("/inventory");
}

export default function BizInventory() {
  const { assumptions } = useAssumptions();
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["biz-inventory"],
    queryFn: fetchInventory,
    retry: 1,
  });

  const costs = {
    tileSetCostAt200: assumptions.tileSetCostAt200,
    matCost: assumptions.matCost,
    luxuryBoxCost: assumptions.luxuryBoxCost,
    rackSetCost: assumptions.rackSetCost,
  };

  const getUnitCost = (productId: string): number => {
    const fn = PRODUCT_COST_MAP[productId];
    return fn ? fn(costs) : 0;
  };

  const totalOnHand = inventory.reduce((s, i) => s + i.onHand, 0);
  const totalInventoryValue = inventory.reduce((s, i) => s + i.onHand * getUnitCost(i.productId), 0);
  const totalCashToReorder = inventory.reduce((s, i) => s + calcInventoryReorderCash(i, getUnitCost(i.productId)), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Inventory & Reorder Planning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tile sets have a {assumptions.tileProductionLeadTimeMonths}-month production lead time
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total SKUs", value: inventory.length.toString() },
          { label: "On-Hand Units", value: totalOnHand.toLocaleString() },
          { label: "Inventory Value", value: fmt(totalInventoryValue) },
          { label: "Cash to Reorder All", value: fmt(totalCashToReorder) },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl shadow-sm p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{isLoading ? "…" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Inventory table */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Product", "On Hand", "Ordered", "In Production", "Lead Time", "Reorder Point", "Reorder Qty", "Est. Cash Required"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : inventory.map((item) => {
              const unitCost = getUnitCost(item.productId);
              const cashRequired = calcInventoryReorderCash(item, unitCost);
              const belowReorder = item.onHand <= item.reorderPoint;
              return (
                <tr key={item.productId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{item.productName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={belowReorder ? "text-amber-600 font-semibold" : "text-foreground"}>
                      {item.onHand}
                    </span>
                    {belowReorder && (
                      <span className="ml-1.5 text-xs text-amber-600 font-medium">Low</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{item.ordered}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{item.inProduction}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs font-medium">
                      {item.leadTimeWeeks}w
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{item.reorderPoint}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground font-medium">{item.reorderQty}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-foreground">{fmt(cashRequired)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40">
              <td className="px-4 py-3 font-bold text-foreground">Totals</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{totalOnHand}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{inventory.reduce((s, i) => s + i.ordered, 0)}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{inventory.reduce((s, i) => s + i.inProduction, 0)}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{inventory.reduce((s, i) => s + i.reorderQty, 0)}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-foreground">{fmt(totalCashToReorder)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm p-5 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Reorder Notes</h2>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Tile sets require a {assumptions.tileProductionLeadTimeMonths}-month ({assumptions.tileProductionLeadTimeMonths * 4}-week) production lead time — order well ahead of target sell dates.</li>
          <li>Items marked "Low" are at or below their reorder point.</li>
          <li>Estimated cash required is calculated at the 200-unit cost tier for tile sets.</li>
        </ul>
      </div>
    </div>
  );
}
