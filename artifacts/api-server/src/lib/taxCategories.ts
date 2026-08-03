// Expense categories mapped to the IRS Schedule C lines a sole proprietor /
// single-member LLC files. The mapping is what makes the year-end export
// usable by an accountant instead of a pile of loose spending.
//
// NOT tax advice — the mapping follows the published Schedule C line
// descriptions, and an accountant should confirm anything unusual.

export interface TaxCategory {
  key: string;
  label: string;
  /** Schedule C line, or "Part III" for cost of goods sold. */
  scheduleC: string;
  /** Portion normally deductible. Meals are the common exception at 50%. */
  deductiblePct: number;
  hint?: string;
}

export const TAX_CATEGORIES: TaxCategory[] = [
  { key: "advertising", label: "Advertising & Marketing", scheduleC: "Line 8", deductiblePct: 100, hint: "Ads, printing, promo materials, sponsored posts." },
  { key: "marketing", label: "Marketing (legacy)", scheduleC: "Line 8", deductiblePct: 100, hint: "Older rows created before the tax categories existed." },
  { key: "car-truck", label: "Car & Truck", scheduleC: "Line 9", deductiblePct: 100, hint: "Parking, tolls, and actual vehicle costs. Mileage is logged separately." },
  { key: "processing-fees", label: "Payment Processing Fees", scheduleC: "Line 10", deductiblePct: 100, hint: "Square, PayPal and card fees." },
  { key: "contract-labor", label: "Contract Labor", scheduleC: "Line 11", deductiblePct: 100, hint: "Anyone paid $600+ in a year needs a W-9 and a 1099-NEC." },
  { key: "equipment", label: "Equipment & Depreciation", scheduleC: "Line 13", deductiblePct: 100, hint: "Laser, tables, larger purchases. May qualify for Section 179 — ask your accountant." },
  { key: "insurance", label: "Insurance", scheduleC: "Line 15", deductiblePct: 100, hint: "Business liability, product liability." },
  { key: "legal-professional", label: "Legal & Professional", scheduleC: "Line 17", deductiblePct: 100, hint: "Accountant, bookkeeper, attorney, tax prep." },
  { key: "office", label: "Office Expense", scheduleC: "Line 18", deductiblePct: 100, hint: "Stationery, postage, small office supplies." },
  { key: "software", label: "Software & Tools", scheduleC: "Line 18", deductiblePct: 100, hint: "Vercel, Supabase, Resend, Canva, subscriptions." },
  { key: "venue-rent", label: "Venue & Space Rental", scheduleC: "Line 20b", deductiblePct: 100, hint: "Event venue fees, booth and table rental." },
  { key: "event-fees", label: "Event Fees", scheduleC: "Line 20b", deductiblePct: 100, hint: "Market/vendor fees not tied to a specific venue booking." },
  { key: "supplies", label: "Supplies", scheduleC: "Line 22", deductiblePct: 100, hint: "Consumables used running the business (not resale stock)." },
  { key: "shipping-supplies", label: "Shipping & Packaging", scheduleC: "Line 22", deductiblePct: 100, hint: "Boxes, mailers, labels, postage for orders." },
  { key: "taxes-licenses", label: "Taxes & Licenses", scheduleC: "Line 23", deductiblePct: 100, hint: "Business licenses, permits, sales-tax registration fees." },
  { key: "travel", label: "Travel", scheduleC: "Line 24a", deductiblePct: 100, hint: "Lodging and airfare for business trips away from home." },
  { key: "event-food", label: "Meals (Events & Business)", scheduleC: "Line 24b", deductiblePct: 50, hint: "Generally 50% deductible. Entertainment is not deductible at all." },
  { key: "utilities", label: "Utilities & Phone", scheduleC: "Line 25", deductiblePct: 100, hint: "Business-use share of phone and internet." },
  { key: "inventory", label: "Inventory for Resale", scheduleC: "Part III (COGS)", deductiblePct: 100, hint: "Use the Inventory Purchases log instead — it belongs in cost of goods sold, not expenses." },
  { key: "home-office", label: "Home Office", scheduleC: "Line 30", deductiblePct: 100, hint: "Simplified method is a rate per square foot of dedicated space — your accountant computes this." },
  { key: "bank-fees", label: "Bank & Merchant Fees", scheduleC: "Line 27a", deductiblePct: 100, hint: "Account fees, wire fees." },
  { key: "other", label: "Other", scheduleC: "Line 27a", deductiblePct: 100, hint: "Anything that doesn't fit above — describe it well." },
];

export const taxCategory = (key: string): TaxCategory =>
  TAX_CATEGORIES.find((c) => c.key === key) ?? {
    key,
    label: key,
    scheduleC: "Line 27a",
    deductiblePct: 100,
  };

export const isTaxCategory = (key: string): boolean => TAX_CATEGORIES.some((c) => c.key === key);
