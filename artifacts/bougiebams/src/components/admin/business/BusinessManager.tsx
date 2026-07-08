import { useEffect, useState } from "react";
import { LayoutDashboard, SlidersHorizontal, Package, CalendarDays, Megaphone, Boxes, GitBranch } from "lucide-react";
import { AssumptionsProvider } from "./AssumptionsContext";
import { setBusinessAuthErrorHandler } from "./api";
import BizDashboard from "./BizDashboard";
import BizAssumptions from "./BizAssumptions";
import BizProducts from "./BizProducts";
import BizEvents from "./BizEvents";
import BizMarketing from "./BizMarketing";
import BizInventory from "./BizInventory";
import BizScenarios from "./BizScenarios";

// Business HQ — forecasting/planning suite ported from the BougieBams-Business
// repo. One admin view with internal tabs so the Admin.tsx shell stays small.

type BizTab = "dashboard" | "assumptions" | "products" | "events" | "marketing" | "inventory" | "scenarios";

const TABS: { key: BizTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "assumptions", label: "Assumptions", icon: SlidersHorizontal },
  { key: "products", label: "Products", icon: Package },
  { key: "events", label: "Events ROI", icon: CalendarDays },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "scenarios", label: "Scenarios", icon: GitBranch },
];

export default function BusinessManager({ onAuthError }: { onAuthError: (status: number) => void }) {
  const [tab, setTab] = useState<BizTab>("dashboard");

  useEffect(() => {
    setBusinessAuthErrorHandler(onAuthError);
    return () => setBusinessAuthErrorHandler(null);
  }, [onAuthError]);

  return (
    <AssumptionsProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap gap-1 border-b border-[#E2DBCD] -mb-px">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 transition-colors ${
                  active
                    ? "border-[#D4AF37] text-[#1E2A5A] font-semibold bg-white"
                    : "border-transparent text-[#5A6178] hover:text-[#1E2A5A] hover:bg-white/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {tab === "dashboard" ? (
          <BizDashboard />
        ) : tab === "assumptions" ? (
          <BizAssumptions />
        ) : tab === "products" ? (
          <BizProducts />
        ) : tab === "events" ? (
          <BizEvents />
        ) : tab === "marketing" ? (
          <BizMarketing />
        ) : tab === "inventory" ? (
          <BizInventory />
        ) : (
          <BizScenarios />
        )}
      </div>
    </AssumptionsProvider>
  );
}
