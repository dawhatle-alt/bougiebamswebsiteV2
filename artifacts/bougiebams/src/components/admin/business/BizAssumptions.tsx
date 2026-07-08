import { useAssumptions } from "./AssumptionsContext";
import type { BusinessAssumptions } from "./types";
import { RotateCcw } from "lucide-react";

function NumberInput({
  label,
  field,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
}: {
  label: string;
  field: keyof BusinessAssumptions;
  value: number;
  onChange: (field: keyof BusinessAssumptions, value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <label htmlFor={`input-${field}`} className="text-sm text-foreground font-medium min-w-0 flex-1">
        {label}
      </label>
      <div className="flex items-center gap-1 shrink-0">
        {prefix && <span className="text-muted-foreground text-sm">{prefix}</span>}
        <input
          id={`input-${field}`}
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={(e) => onChange(field, parseFloat(e.target.value) || 0)}
          className="w-28 text-right bg-input/60 border border-border rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {suffix && <span className="text-muted-foreground text-sm w-8">{suffix}</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl shadow-sm p-6">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function BizAssumptions() {
  const { assumptions, updateAssumptions, resetAssumptions } = useAssumptions();

  const set = (field: keyof BusinessAssumptions, val: number) =>
    updateAssumptions({ [field]: val });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Assumptions Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Changes propagate to all modules instantly</p>
        </div>
        <button
          onClick={resetAssumptions}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-4 py-2 transition-colors hover:bg-muted/60"
        >
          <RotateCcw size={14} />
          Reset to Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Capital & Budget">
          <NumberInput label="Startup Capital" field="startupCapital" value={assumptions.startupCapital} onChange={set} prefix="$" step={1000} />
          <NumberInput label="Year 1 Marketing Budget" field="yearOneMarketingBudget" value={assumptions.yearOneMarketingBudget} onChange={set} prefix="$" step={500} />
          <NumberInput label="Laser Equipment Cost" field="laserEquipmentCost" value={assumptions.laserEquipmentCost} onChange={set} prefix="$" step={500} />
        </Section>

        <Section title="Tile Sets">
          <NumberInput label="MSRP" field="tileSetMSRP" value={assumptions.tileSetMSRP} onChange={set} prefix="$" step={10} />
          <NumberInput label="Cost (100-unit order)" field="tileSetCostAt100" value={assumptions.tileSetCostAt100} onChange={set} prefix="$" step={0.5} />
          <NumberInput label="Cost (200-unit order)" field="tileSetCostAt200" value={assumptions.tileSetCostAt200} onChange={set} prefix="$" step={0.5} />
          <NumberInput label="Year 1 Units Target" field="tileSetUnitsTarget" value={assumptions.tileSetUnitsTarget} onChange={set} suffix="units" />
        </Section>

        <Section title="Matching Mat">
          <NumberInput label="MSRP" field="matMSRP" value={assumptions.matMSRP} onChange={set} prefix="$" step={5} />
          <NumberInput label="Unit Cost" field="matCost" value={assumptions.matCost} onChange={set} prefix="$" step={1} />
          <NumberInput label="Year 1 Units Target" field="matUnitsTarget" value={assumptions.matUnitsTarget} onChange={set} suffix="units" />
        </Section>

        <Section title="Luxury Box">
          <NumberInput label="MSRP" field="luxuryBoxMSRP" value={assumptions.luxuryBoxMSRP} onChange={set} prefix="$" step={5} />
          <NumberInput label="Unit Cost" field="luxuryBoxCost" value={assumptions.luxuryBoxCost} onChange={set} prefix="$" step={1} />
          <NumberInput label="Year 1 Units Target" field="luxuryBoxUnitsTarget" value={assumptions.luxuryBoxUnitsTarget} onChange={set} suffix="units" />
        </Section>

        <Section title="Rack Set">
          <NumberInput label="MSRP" field="rackSetMSRP" value={assumptions.rackSetMSRP} onChange={set} prefix="$" step={5} />
          <NumberInput label="Unit Cost" field="rackSetCost" value={assumptions.rackSetCost} onChange={set} prefix="$" step={1} />
          <NumberInput label="Year 1 Units Target" field="rackSetUnitsTarget" value={assumptions.rackSetUnitsTarget} onChange={set} suffix="units" />
        </Section>

        <Section title="Events">
          <NumberInput label="Events Per Year" field="eventsPerYear" value={assumptions.eventsPerYear} onChange={set} suffix="events" />
          <NumberInput label="Avg Attendees" field="avgAttendees" value={assumptions.avgAttendees} onChange={set} suffix="ppl" />
          <NumberInput label="Avg Ticket Price" field="avgTicketPrice" value={assumptions.avgTicketPrice} onChange={set} prefix="$" step={5} />
          <NumberInput label="Avg Venue Cost / Attendee" field="avgVenueCostPerAttendee" value={assumptions.avgVenueCostPerAttendee} onChange={set} prefix="$" step={1} />
        </Section>

        <Section title="Operations">
          <NumberInput label="Tile Production Lead Time" field="tileProductionLeadTimeMonths" value={assumptions.tileProductionLeadTimeMonths} onChange={set} suffix="mo" />
        </Section>
      </div>
    </div>
  );
}
