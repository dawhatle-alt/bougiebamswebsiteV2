import { useState, useEffect } from "react";
import {
  CalendarDays, FileText, Mail, Package, Loader2, DollarSign, TrendingUp,
  Receipt, AlertTriangle, UserPlus, Users, ChevronRight,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  totalSpots: number;
  spotsLeft: number;
  priceCents: number;
  published: boolean;
  confirmedCount: number;
  collectedCents: number;
}

interface Activity {
  type: "order" | "registration" | "subscriber";
  at: string;
  title: string;
  detail: string;
}

interface Dashboard {
  revenue: {
    totalCents: number;
    monthCents: number;
    weekCents: number;
    totalOrders: number;
    weekOrders: number;
  };
  upcomingEvents: UpcomingEvent[];
  activity: Activity[];
  alerts: {
    pendingRegistrations: number;
    outOfStockVisible: number;
  };
  totals: {
    subscribers: number;
    events: number;
    products: number;
    blogPosts: number;
  };
}

type NavTarget = "orders" | "registrations" | "products" | "subscribers" | "events" | "blog";

interface Props {
  onAuthError: () => void;
  onNavigate?: (view: NavTarget) => void;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatEventDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

export default function DashboardStats({ onAuthError, onNavigate }: Props) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/admin/dashboard`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401 || r.status === 403) { onAuthError(); return null; }
        if (!r.ok) throw new Error("Failed");
        return r.json() as Promise<Dashboard>;
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => setError("Could not load the dashboard."))
      .finally(() => setLoading(false));
  }, [onAuthError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || "Could not load the dashboard."}
      </div>
    );
  }

  const { revenue, upcomingEvents, activity, alerts, totals } = data;
  const soldOut = upcomingEvents.filter((e) => e.spotsLeft <= 0);
  const zeroRegs = upcomingEvents.filter((e) => e.published && e.confirmedCount === 0);
  const hasAlerts = alerts.pendingRegistrations > 0 || alerts.outOfStockVisible > 0 || soldOut.length > 0 || zeroRegs.length > 0;

  const activityIcon = (t: Activity["type"]) =>
    t === "order" ? Receipt : t === "registration" ? Users : UserPlus;

  const revenueCards = [
    { label: "Total Revenue", value: money(revenue.totalCents), sub: `${revenue.totalOrders} order${revenue.totalOrders === 1 ? "" : "s"} all time`, icon: DollarSign },
    { label: "This Month", value: money(revenue.monthCents), sub: "products & events", icon: TrendingUp },
    { label: "This Week", value: money(revenue.weekCents), sub: `${revenue.weekOrders} order${revenue.weekOrders === 1 ? "" : "s"} in 7 days`, icon: Receipt },
  ];

  const countChips: { label: string; value: number; icon: typeof Mail; nav: NavTarget }[] = [
    { label: "Subscribers", value: totals.subscribers, icon: Mail, nav: "subscribers" },
    { label: "Events", value: totals.events, icon: CalendarDays, nav: "events" },
    { label: "Products", value: totals.products, icon: Package, nav: "products" },
    { label: "Blog Posts", value: totals.blogPosts, icon: FileText, nav: "blog" },
  ];

  return (
    <div className="space-y-6">
      {/* Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {revenueCards.map(({ label, value, sub, icon: Icon }) => (
          <button
            key={label}
            onClick={() => onNavigate?.("orders")}
            className="text-left rounded-xl border border-[#E2DBCD] bg-white p-6 shadow-sm hover:border-[#D4AF37]/60 hover:shadow transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs uppercase tracking-wider text-[#9A8F7E]">{label}</span>
            </div>
            <p className="text-3xl font-semibold text-[#1E2A5A]">{value}</p>
            <p className="text-xs text-[#9A8F7E] mt-1">{sub}</p>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Needs attention</span>
          </div>
          <ul className="space-y-1.5 text-sm text-amber-800">
            {alerts.pendingRegistrations > 0 && (
              <li>
                <button className="hover:underline inline-flex items-center gap-1" onClick={() => onNavigate?.("registrations")}>
                  {alerts.pendingRegistrations} pending registration{alerts.pendingRegistrations === 1 ? "" : "s"} (checkout started, payment not completed)
                  <ChevronRight className="w-3 h-3" />
                </button>
              </li>
            )}
            {alerts.outOfStockVisible > 0 && (
              <li>
                <button className="hover:underline inline-flex items-center gap-1" onClick={() => onNavigate?.("products")}>
                  {alerts.outOfStockVisible} out-of-stock product{alerts.outOfStockVisible === 1 ? "" : "s"} still visible in the shop
                  <ChevronRight className="w-3 h-3" />
                </button>
              </li>
            )}
            {soldOut.map((e) => (
              <li key={`so-${e.id}`}>
                <button className="hover:underline inline-flex items-center gap-1" onClick={() => onNavigate?.("events")}>
                  "{e.title}" is sold out ({e.totalSpots} spots)
                  <ChevronRight className="w-3 h-3" />
                </button>
              </li>
            ))}
            {zeroRegs.map((e) => (
              <li key={`zr-${e.id}`}>
                <button className="hover:underline inline-flex items-center gap-1" onClick={() => onNavigate?.("events")}>
                  "{e.title}" ({formatEventDate(e.date)}) has no registrations yet
                  <ChevronRight className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming events */}
        <div className="rounded-xl border border-[#E2DBCD] bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#1E2A5A] uppercase tracking-wider">Upcoming Events</h3>
            <button className="text-xs text-[#9A8F7E] hover:text-[#1E2A5A] inline-flex items-center gap-0.5" onClick={() => onNavigate?.("events")}>
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-[#9A8F7E] py-6 text-center">No upcoming events scheduled.</p>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((e) => {
                const filled = Math.max(0, e.totalSpots - e.spotsLeft);
                const pct = e.totalSpots > 0 ? Math.min(100, Math.round((filled / e.totalSpots) * 100)) : 0;
                return (
                  <div key={e.id}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-[#1E2A5A] truncate">
                        {e.title}
                        {!e.published && <span className="ml-2 text-[10px] uppercase tracking-wider text-[#9A8F7E]">draft</span>}
                      </span>
                      <span className="text-xs text-[#9A8F7E] whitespace-nowrap">{formatEventDate(e.date)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-[#F0EBE1] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${e.spotsLeft <= 0 ? "bg-amber-500" : "bg-[#1E2A5A]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#5A6178] whitespace-nowrap w-32 text-right">
                        {e.spotsLeft <= 0 ? "Sold out" : `${filled}/${e.totalSpots} spots filled`}
                        {e.collectedCents > 0 && <span className="text-[#9A8F7E]"> · {money(e.collectedCents)}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-[#E2DBCD] bg-white p-6">
          <h3 className="text-sm font-medium text-[#1E2A5A] uppercase tracking-wider mb-4">Recent Activity</h3>
          {activity.length === 0 ? (
            <p className="text-sm text-[#9A8F7E] py-6 text-center">
              Orders, registrations, and subscribers will show up here.
            </p>
          ) : (
            <div className="space-y-3">
              {activity.map((a, i) => {
                const Icon = activityIcon(a.type);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#FAF7F0] border border-[#E2DBCD] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1E2A5A] truncate">{a.title}</p>
                      {a.detail && <p className="text-xs text-[#9A8F7E] truncate">{a.detail}</p>}
                    </div>
                    <span className="text-[11px] text-[#C5BBAC] whitespace-nowrap">{formatWhen(a.at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {countChips.map(({ label, value, icon: Icon, nav }) => (
          <button
            key={label}
            onClick={() => onNavigate?.(nav)}
            className="text-left rounded-xl border border-[#E2DBCD] bg-white px-4 py-3 shadow-sm hover:border-[#D4AF37]/60 transition-colors flex items-center gap-3"
          >
            <Icon className="w-4 h-4 text-[#9A8F7E]" />
            <span className="text-sm text-[#5A6178] flex-1">{label}</span>
            <span className="text-lg font-semibold text-[#1E2A5A]">{value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
