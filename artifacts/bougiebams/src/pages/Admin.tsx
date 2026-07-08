import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  Download,
  FileText,
  Loader2,
  LogOut,
  Mail,
  Package,
  RefreshCw,
  LayoutDashboard,
  Users,
  Image,
  Tag,
  GraduationCap,
  Heart,
  Camera,
  Megaphone,
  MessageCircle,
  Newspaper,
  LayoutGrid,
  Receipt,
  Briefcase,
  Menu,
  X,
} from "lucide-react";
import BlogManager from "@/components/admin/BlogManager";
import ProductManager from "@/components/admin/ProductManager";
import EventsManager from "@/components/admin/EventsManager";
import DashboardStats from "@/components/admin/DashboardStats";
import RegistrationsManager from "@/components/admin/RegistrationsManager";
import HeroImagesManager from "@/components/admin/HeroImagesManager";
import DiscountCodesManager from "@/components/admin/DiscountCodesManager";
import LessonsManager from "@/components/admin/LessonsManager";
import FavoritesManager from "@/components/admin/FavoritesManager";
import GalleryManager from "@/components/admin/GalleryManager";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import PressBarManager from "@/components/admin/PressBarManager";
import ChatbotManager from "@/components/admin/ChatbotManager";
import CuratedCollectionsManager from "@/components/admin/CuratedCollectionsManager";
import OrdersManager from "@/components/admin/OrdersManager";
import BusinessManager from "@/components/admin/business/BusinessManager";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type AdminView =
  | "dashboard"
  | "subscribers"
  | "blog"
  | "products"
  | "events"
  | "registrations"
  | "hero"
  | "discounts"
  | "lessons"
  | "favorites"
  | "gallery"
  | "announcement"
  | "pressbar"
  | "chatbot"
  | "curated"
  | "orders"
  | "business";

interface Subscriber {
  id: number;
  email: string;
  source: string | null;
  discountCode: string | null;
  createdAt: string;
}

interface AuthUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user: AuthUser | null } | null) => {
        if (!cancelled) {
          setUser(d?.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { user, isLoading, isAuthenticated: !!user };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sourceLabel(source: string | null) {
  if (!source) return "—";
  return source
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { key: "dashboard" as AdminView, label: "Dashboard", icon: LayoutDashboard },
      { key: "business" as AdminView, label: "Business HQ", icon: Briefcase },
    ],
  },
  {
    label: "Community",
    items: [
      { key: "subscribers" as AdminView, label: "Subscribers", icon: Mail },
      { key: "registrations" as AdminView, label: "Registrations", icon: Users },
    ],
  },
  {
    label: "Content",
    items: [
      { key: "blog" as AdminView, label: "Blog", icon: FileText },
      { key: "events" as AdminView, label: "Events", icon: CalendarDays },
      { key: "lessons" as AdminView, label: "Education", icon: GraduationCap },
    ],
  },
  {
    label: "Shop",
    items: [
      { key: "orders" as AdminView, label: "Orders", icon: Receipt },
      { key: "products" as AdminView, label: "Products", icon: Package },
      { key: "discounts" as AdminView, label: "Discount Codes", icon: Tag },
      { key: "favorites" as AdminView, label: "Favorites", icon: Heart },
    ],
  },
  {
    label: "Site",
    items: [
      { key: "hero" as AdminView, label: "Homepage Images", icon: Image },
      { key: "curated" as AdminView, label: "Curated Collections", icon: LayoutGrid },
      { key: "gallery" as AdminView, label: "Event Gallery", icon: Camera },
      { key: "announcement" as AdminView, label: "Announcement Bar", icon: Megaphone },
      { key: "pressbar" as AdminView, label: "Featured In", icon: Newspaper },
      { key: "chatbot" as AdminView, label: "Chat Assistant", icon: MessageCircle },
    ],
  },
];

const VIEW_LABELS: Record<AdminView, string> = {
  dashboard: "Overview",
  subscribers: "Email Subscribers",
  blog: "Blog Manager",
  products: "Products",
  events: "Events",
  registrations: "Event Registrations",
  hero: "Homepage Images",
  discounts: "Discount Codes",
  lessons: "Education",
  favorites: "Favorites",
  gallery: "Event Gallery",
  announcement: "Announcement Bar",
  pressbar: "Featured In",
  chatbot: "Chat Assistant",
  curated: "Curated Collections",
  orders: "Orders",
  business: "Business HQ",
};

function AdminLoginScreen({ apiBase }: { apiBase: string }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTokenLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; useOidc?: boolean };
      if (data.useOidc) {
        setError(
          "ADMIN_TOKEN is not configured on the server. Set the ADMIN_TOKEN and ADMIN_USER_IDS environment variables and redeploy.",
        );
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Invalid token");
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E2A5A] px-4">
      <div className="w-full max-w-sm bg-[#FAF7F0] rounded-md border border-[#E2DBCD] p-8 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1E2A5A] mb-4">
            <Mail className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <h1
            className="text-2xl text-[#1E2A5A] mb-1"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            BougieBams Admin
          </h1>
          <p className="text-sm text-[#5A6178] text-center">
            Enter your admin token to continue.
          </p>
        </div>

        <form onSubmit={handleTokenLogin} className="space-y-3">
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-2 border border-[#E2DBCD] rounded text-sm bg-white text-[#1E2A5A] placeholder-[#B0A99A] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            autoComplete="current-password"
            required
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
            Sign in
          </Button>
        </form>

      </div>
    </div>
  );
}

export default function Admin() {
  const { user, isLoading, isAuthenticated } = useAuth();

  const [view, setView] = useState<AdminView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const handleAuthError = useCallback((status?: number) => {
    if (status === 401) {
      // Session expired or missing — reload so the token login screen shows.
      window.location.href = "/admin";
      return;
    }
    // 403 (or unknown): signed in but unauthorized, or the session became invalid.
    setLoadError(
      "Your admin session is no longer valid or this account isn't authorized. Sign out and back in, and make sure ADMIN_USER_IDS on the server includes your user ID.",
    );
  }, []);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/subscribers`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        handleAuthError(res.status);
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    } catch {
      setLoadError("Could not load subscribers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadSubscribers();
    }
  }, [isAuthenticated, loadSubscribers]);

  function handleLogout() {
    window.location.href = `${API_BASE}/api/logout`;
  }

  function handleExport() {
    const header = ["Email", "Source", "Discount Code", "Date Joined"];
    const rows = subscribers.map((s) => [
      s.email,
      sourceLabel(s.source),
      s.discountCode ?? "",
      formatDate(s.createdAt),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bougiebams-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function navigate(key: AdminView) {
    setView(key);
    setSidebarOpen(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2A5A]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginScreen apiBase={API_BASE} />;
  }

  const sidebar = (
    <aside className="flex flex-col h-full bg-[#1E2A5A] w-60 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <p
          className="text-[#D4AF37] text-xl leading-tight"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          BougieBams
        </p>
        <p className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
          Admin Panel
        </p>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-widest text-white/35 px-2 mb-1.5 font-medium">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ key, label, icon: Icon }) => {
                const active = view === key;
                return (
                  <li key={key}>
                    <button
                      onClick={() => navigate(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                          : "text-white/65 hover:text-white hover:bg-white/8"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#D4AF37]" : ""}`} />
                      <span className="truncate">{label}</span>
                      {active && (
                        <span className="ml-auto w-1 h-4 rounded-full bg-[#D4AF37] shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        {user?.firstName && (
          <p className="text-xs text-white/40 truncate mb-2">
            Signed in as {user.firstName}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-white/55 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-screen sticky top-0">
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col h-full">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E2DBCD] px-5 py-4 flex items-center gap-4 sticky top-0 z-10">
          <button
            className="lg:hidden text-[#1E2A5A] p-1 rounded hover:bg-[#FAF7F0] transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1
              className="text-lg text-[#1E2A5A] leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {VIEW_LABELS[view]}
            </h1>
          </div>
        </header>

        <main className="flex-1 px-5 py-7 max-w-5xl w-full">
          {view === "dashboard" ? (
            <DashboardStats onAuthError={handleAuthError} onNavigate={setView} />
          ) : view === "blog" ? (
            <BlogManager onAuthError={handleAuthError} />
          ) : view === "products" ? (
            <ProductManager onAuthError={handleAuthError} />
          ) : view === "events" ? (
            <EventsManager onAuthError={handleAuthError} />
          ) : view === "registrations" ? (
            <RegistrationsManager onAuthError={handleAuthError} />
          ) : view === "hero" ? (
            <HeroImagesManager onAuthError={handleAuthError} />
          ) : view === "discounts" ? (
            <DiscountCodesManager onAuthError={handleAuthError} />
          ) : view === "lessons" ? (
            <LessonsManager onAuthError={handleAuthError} />
          ) : view === "favorites" ? (
            <FavoritesManager onAuthError={handleAuthError} />
          ) : view === "gallery" ? (
            <GalleryManager onAuthError={handleAuthError} />
          ) : view === "announcement" ? (
            <AnnouncementManager onAuthError={handleAuthError} />
          ) : view === "pressbar" ? (
            <PressBarManager onAuthError={handleAuthError} />
          ) : view === "chatbot" ? (
            <ChatbotManager onAuthError={handleAuthError} />
          ) : view === "curated" ? (
            <CuratedCollectionsManager onAuthError={handleAuthError} />
          ) : view === "orders" ? (
            <OrdersManager onAuthError={handleAuthError} />
          ) : view === "business" ? (
            <BusinessManager onAuthError={handleAuthError} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-2 text-[#1E2A5A]">
                  <Mail className="w-5 h-5 text-[#D4AF37]" />
                  <span className="text-lg font-medium">
                    {subscribers.length}{" "}
                    {subscribers.length === 1 ? "subscriber" : "subscribers"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={loadSubscribers}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={subscribers.length === 0}
                    className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {loadError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {loadError}
                </div>
              )}

              <div className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
                {loading && subscribers.length === 0 ? (
                  <div className="py-16 text-center text-[#5A6178]">Loading…</div>
                ) : subscribers.length === 0 ? (
                  <div className="py-16 text-center text-[#5A6178]">
                    No subscribers yet. They'll appear here as people sign up.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Discount Code</TableHead>
                        <TableHead className="text-right">Date Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscribers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-[#1E2A5A]">
                            {s.email}
                          </TableCell>
                          <TableCell className="text-[#5A6178]">
                            {sourceLabel(s.source)}
                          </TableCell>
                          <TableCell className="text-[#5A6178]">
                            {s.discountCode ?? "—"}
                          </TableCell>
                          <TableCell className="text-right text-[#5A6178]">
                            {formatDate(s.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}