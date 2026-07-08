// Business HQ domain types, ported from the BougieBams-Business repo
// (lib/shared + frontend mockData). Numbers are hand-entered planning values.

export interface BusinessAssumptions {
  startupCapital: number;
  yearOneMarketingBudget: number;
  tileSetMSRP: number;
  tileSetCostAt100: number;
  tileSetCostAt200: number;
  tileSetUnitsTarget: number;
  matMSRP: number;
  matCost: number;
  matUnitsTarget: number;
  luxuryBoxMSRP: number;
  luxuryBoxCost: number;
  luxuryBoxUnitsTarget: number;
  rackSetMSRP: number;
  rackSetCost: number;
  rackSetUnitsTarget: number;
  eventsPerYear: number;
  avgAttendees: number;
  avgTicketPrice: number;
  avgVenueCostPerAttendee: number;
  laserEquipmentCost: number;
  tileProductionLeadTimeMonths: number;
}

export interface BusinessEvent {
  id: string;
  name: string;
  date: string;
  status: "completed" | "upcoming";
  attendees: number;
  ticketPrice: number;
  venueCostPerAttendee: number;
  otherExpenses: number;
  emailSignups: number;
  instagramFollowersGained: number;
  productSalesGenerated: number;
}

export interface MarketingChannel {
  id: string;
  name: string;
  allocationPct: number;
  spend: number;
  leads: number;
  customers: number;
  revenueInfluenced: number;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  onHand: number;
  ordered: number;
  inProduction: number;
  leadTimeWeeks: number;
  reorderPoint: number;
  reorderQty: number;
}

export interface Scenario {
  id: string;
  name: string;
  unitsSoldMultiplier: number;
  marketingSpendMultiplier: number;
  eventCount: number;
}

export interface Product {
  id: string;
  name: string;
  getMSRP: (a: BusinessAssumptions) => number;
  getUnitCost: (a: BusinessAssumptions) => number;
  getUnitsSold: (a: BusinessAssumptions) => number;
  inventoryOnHand: number;
  notes: string;
}

export interface KPI {
  label: string;
  value: string;
  note: string;
}

// Used until the API responds, and by "Reset to defaults".
export const defaultAssumptions: BusinessAssumptions = {
  startupCapital: 50000,
  yearOneMarketingBudget: 15000,
  tileSetMSRP: 299,
  tileSetCostAt100: 74.5,
  tileSetCostAt200: 63.63,
  tileSetUnitsTarget: 500,
  matMSRP: 120,
  matCost: 79,
  matUnitsTarget: 500,
  luxuryBoxMSRP: 49.95,
  luxuryBoxCost: 22,
  luxuryBoxUnitsTarget: 200,
  rackSetMSRP: 120,
  rackSetCost: 45,
  rackSetUnitsTarget: 100,
  eventsPerYear: 20,
  avgAttendees: 30,
  avgTicketPrice: 30,
  avgVenueCostPerAttendee: 12,
  laserEquipmentCost: 10000,
  tileProductionLeadTimeMonths: 3,
};

export const sampleProducts: Product[] = [
  {
    id: "tile-set",
    name: "Premium Tile Set",
    getMSRP: (a) => a.tileSetMSRP,
    getUnitCost: (a) => a.tileSetCostAt200,
    getUnitsSold: (a) => a.tileSetUnitsTarget,
    inventoryOnHand: 12,
    notes: "200+ unit cost tier. 3-mo lead time.",
  },
  {
    id: "mat",
    name: "Matching Mat",
    getMSRP: (a) => a.matMSRP,
    getUnitCost: (a) => a.matCost,
    getUnitsSold: (a) => a.matUnitsTarget,
    inventoryOnHand: 35,
    notes: "Sold as complement to tile set.",
  },
  {
    id: "luxury-box",
    name: "Luxury Box",
    getMSRP: (a) => a.luxuryBoxMSRP,
    getUnitCost: (a) => a.luxuryBoxCost,
    getUnitsSold: (a) => a.luxuryBoxUnitsTarget,
    inventoryOnHand: 28,
    notes: "Add-on / gift option.",
  },
  {
    id: "rack-set",
    name: "Rack Set",
    getMSRP: (a) => a.rackSetMSRP,
    getUnitCost: (a) => a.rackSetCost,
    getUnitsSold: (a) => a.rackSetUnitsTarget,
    inventoryOnHand: 18,
    notes: "Tournament-grade accessory.",
  },
];
