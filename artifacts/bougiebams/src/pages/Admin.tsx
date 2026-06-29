import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, Download, FileText, Lock, LogOut, Mail, Package, RefreshCw } from "lucide-react";
import BlogManager from "@/components/admin/BlogManager";
import ProductImageManager from "@/components/admin/ProductImageManager";
import EventsManager from "@/components/admin/EventsManager";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "bougiebams_admin_token";

type AdminView = "subscribers" | "blog" | "products" | "events";

interface Subscriber {
  id: number;
  email: string;
  source: string | null;
  discountCode: string | null;
  createdAt: string;
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
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null,
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [view, setView] = useState<AdminView>("subscribers");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const handleAuthError = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setLoadError("Your session expired. Please sign in again.");
  }, []);

  const loadSubscribers = useCallback(async (authToken: string) => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/subscribers`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setLoadError("Your session expired. Please sign in again.");
        return;
      }
      if (!res.ok) {
        throw new Error("Request failed");
      }
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    } catch {
      setLoadError("Could not load subscribers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void loadSubscribers(token);
    }
  }, [token, loadSubscribers]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        const issued = data.token as string;
        sessionStorage.setItem(STORAGE_KEY, issued);
        setToken(issued);
        setPassword("");
      } else if (res.status === 401) {
        setLoginError("Incorrect password.");
      } else if (res.status === 429) {
        setLoginError(
          "Too many attempts. Please wait a few minutes and try again.",
        );
      } else {
        setLoginError("Admin access is not available right now.");
      }
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setSubscribers([]);
    window.location.href = "/";
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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2A5A] px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-[#FAF7F0] rounded-md border border-[#E2DBCD] p-8 shadow-xl"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1E2A5A] mb-4">
              <Lock className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <h1
              className="text-2xl text-[#1E2A5A]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              BougieBams Admin
            </h1>
            <p className="text-sm text-[#5A6178] mt-1">
              Enter your password to continue
            </p>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            className="mb-3"
          />
          {loginError && (
            <p className="text-sm text-red-600 mb-3">{loginError}</p>
          )}
          <Button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          >
            {loggingIn ? "Signing in…" : "Sign in"}
          </Button>
        </form>
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
              {view === "subscribers" ? "Email Subscribers" : view === "blog" ? "Blog Manager" : view === "products" ? "Product Images" : "Events"}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-[#FAF7F0] hover:bg-white/10 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      <nav className="bg-[#172248] px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-1">
          {([
            { key: "subscribers", label: "Subscribers", icon: Mail },
            { key: "blog", label: "Blog", icon: FileText },
            { key: "products", label: "Products", icon: Package },
            { key: "events", label: "Events", icon: CalendarDays },
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
        {view === "blog" ? (
          token ? (
            <BlogManager token={token} onAuthError={handleAuthError} />
          ) : null
        ) : view === "products" ? (
          token ? (
            <ProductImageManager token={token} onAuthError={handleAuthError} />
          ) : null
        ) : view === "events" ? (
          token ? (
            <EventsManager token={token} onAuthError={handleAuthError} />
          ) : null
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
              onClick={() => token && loadSubscribers(token)}
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
