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
} from "lucide-react";
import BlogManager from "@/components/admin/BlogManager";
import ProductManager from "@/components/admin/ProductManager";
import EventsManager from "@/components/admin/EventsManager";
import DashboardStats from "@/components/admin/DashboardStats";
import RegistrationsManager from "@/components/admin/RegistrationsManager";
import HeroImagesManager from "@/components/admin/HeroImagesManager";
import DiscountCodesManager from "@/components/admin/DiscountCodesManager";
import LessonsManager from "@/components/admin/LessonsManager";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type AdminView = "dashboard" | "subscribers" | "blog" | "products" | "events" | "registrations" | "hero" | "discounts" | "lessons";

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

export default function Admin() {
  const { user, isLoading, isAuthenticated } = useAuth();

  const [view, setView] = useState<AdminView>("dashboard");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const handleAuthError = useCallback(() => {
    window.location.href = `${API_BASE}/api/login?returnTo=/admin`;
  }, []);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/subscribers`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        handleAuthError();
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2A5A]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2A5A] px-4">
        <div className="w-full max-w-sm bg-[#FAF7F0] rounded-md border border-[#E2DBCD] p-8 shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1E2A5A] mb-4">
            <Mail className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <h1
            className="text-2xl text-[#1E2A5A] mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            BougieBams Admin
          </h1>
          <p className="text-sm text-[#5A6178] mb-6">
            Sign in with your Replit account to access the admin panel.
          </p>
          <Button
            className="w-full bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
            onClick={() => {
              window.location.href = `${API_BASE}/api/login?returnTo=/admin`;
            }}
          >
            Sign in with Replit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0]">
      <header className="bg-[#1E2A5A] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl text-[#D4AF37]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              BougieBams Admin
            </h1>
            <p className="text-xs uppercase tracking-widest text-[rgba(245,240,234,0.6)] mt-1">
              {view === "dashboard"
                ? "Overview"
                : view === "subscribers"
                  ? "Email Subscribers"
                  : view === "blog"
                    ? "Blog Manager"
                    : view === "products"
                      ? "Products"
                      : view === "registrations"
                        ? "Event Registrations"
                        : view === "hero"
                          ? "Homepage Images"
                          : view === "discounts"
                            ? "Discount Codes"
                            : view === "lessons"
                              ? "Education"
                              : "Events"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.firstName && (
              <span className="text-xs text-[rgba(245,240,234,0.6)]">
                {user.firstName}
              </span>
            )}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-[#FAF7F0] hover:bg-white/10 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-[#172248] px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-1">
          {([
            { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { key: "subscribers", label: "Subscribers", icon: Mail },
            { key: "registrations", label: "Registrations", icon: Users },
            { key: "blog", label: "Blog", icon: FileText },
            { key: "products", label: "Products", icon: Package },
            { key: "events", label: "Events", icon: CalendarDays },
            { key: "hero", label: "Homepage Images", icon: Image },
            { key: "discounts", label: "Discount Codes", icon: Tag },
            { key: "lessons", label: "Education", icon: GraduationCap },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                view === key
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-[rgba(245,240,234,0.7)] hover:text-[#FAF7F0]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === "dashboard" ? (
          <DashboardStats onAuthError={handleAuthError} />
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
  );
}
