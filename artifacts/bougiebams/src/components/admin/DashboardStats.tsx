import { useState, useEffect } from "react";
import { CalendarDays, FileText, Mail, Package, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Stats {
  totalSubscribers: number;
  totalEvents: number;
  totalProducts: number;
  totalBlogPosts: number;
}

interface Props {
  onAuthError: () => void;
}

export default function DashboardStats({ onAuthError }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/admin/stats`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401 || r.status === 403) { onAuthError(); return null; }
        if (!r.ok) throw new Error("Failed");
        return r.json() as Promise<Stats>;
      })
      .then((data) => { if (data) setStats(data); })
      .catch(() => setError("Could not load stats."))
      .finally(() => setLoading(false));
  }, [onAuthError]);

  const cards = [
    { label: "Subscribers", icon: Mail, value: stats?.totalSubscribers ?? 0, color: "#1E2A5A" },
    { label: "Events", icon: CalendarDays, value: stats?.totalEvents ?? 0, color: "#2E7D32" },
    { label: "Products", icon: Package, value: stats?.totalProducts ?? 0, color: "#7B3F00" },
    { label: "Blog Posts", icon: FileText, value: stats?.totalBlogPosts ?? 0, color: "#6A1B9A" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-[#1E2A5A] mb-6">Site Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, icon: Icon, value, color }) => (
          <div key={label} className="rounded-xl border border-[#E2DBCD] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-sm font-medium text-[#5A6178]">{label}</span>
            </div>
            <p className="text-3xl font-semibold text-[#1E2A5A]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
