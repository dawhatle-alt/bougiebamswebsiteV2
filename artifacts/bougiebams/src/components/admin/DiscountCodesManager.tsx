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
import { Plus, Pencil, Trash2, RefreshCw, Check, X, RotateCcw, Search, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DiscountCode {
  id: number;
  code: string;
  discountPercent: number;
  appliesTo: string;
  description: string | null;
  active: boolean;
  createdAt: string;
}

interface Redemption {
  id: number;
  code: string;
  email: string;
  orderId: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Props {
  onAuthError: () => void;
}

const BLANK: Omit<DiscountCode, "id" | "createdAt"> = {
  code: "",
  discountPercent: 10,
  appliesTo: "both",
  description: "",
  active: true,
};

export default function DiscountCodesManager({ onAuthError }: Props) {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsError, setRedemptionsError] = useState("");
  const [redemptionQuery, setRedemptionQuery] = useState("");
  const [resettingId, setResettingId] = useState<number | null>(null);

  const loadRedemptions = useCallback(async () => {
    setRedemptionsError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/discount-redemptions`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { redemptions: Redemption[] };
      setRedemptions(data.redemptions ?? []);
    } catch {
      setRedemptionsError("Could not load code usage.");
    }
  }, [onAuthError]);

  useEffect(() => { void loadRedemptions(); }, [loadRedemptions]);

  async function handleResetRedemption(r: Redemption) {
    if (!window.confirm(`Reset ${r.code} for ${r.email}? They'll be able to use the code again.`)) return;
    setResettingId(r.id);
    setRedemptionsError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/discount-redemptions/${r.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      setRedemptions((prev) => prev.filter((x) => x.id !== r.id));
    } catch {
      setRedemptionsError("Could not reset the redemption. Please try again.");
    } finally {
      setResettingId(null);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/discount-codes`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCodes(data.codes ?? []);
    } catch {
      setError("Could not load discount codes.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK });
    setSaveError("");
    setShowForm(true);
  }

  function openEdit(code: DiscountCode) {
    setEditing(code);
    setForm({
      code: code.code,
      discountPercent: code.discountPercent,
      appliesTo: code.appliesTo,
      description: code.description ?? "",
      active: code.active,
    });
    setSaveError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.code.trim()) { setSaveError("Code is required."); return; }
    if (form.discountPercent < 1 || form.discountPercent > 100) {
      setSaveError("Discount must be between 1 and 100.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const url = editing
        ? `${API_BASE}/api/admin/discount-codes/${editing.id}`
        : `${API_BASE}/api/admin/discount-codes`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          discountPercent: Number(form.discountPercent),
          appliesTo: form.appliesTo,
          description: form.description?.trim() || null,
          active: form.active,
        }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Save failed");
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this discount code?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/discount-codes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      await load();
    } catch {
      alert("Delete failed.");
    }
  }

  async function handleToggleActive(code: DiscountCode) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/discount-codes/${code.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...code, active: !code.active }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      await load();
    } catch {
      alert("Update failed.");
    }
  }

  const appliesToLabel = (v: string) =>
    v === "events" ? "Events only" : v === "products" ? "Products only" : "Events & Products";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[#1E2A5A]">
          <span className="text-lg font-medium">Discount Codes</span>
          <span className="text-sm text-[#5A6178]">({codes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Code
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-md border border-[#E2DBCD] bg-white p-6">
          <h3 className="text-base font-semibold text-[#1E2A5A] mb-4">
            {editing ? "Edit Discount Code" : "New Discount Code"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5A6178] mb-1 uppercase tracking-wide">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6178] mb-1 uppercase tracking-wide">
                Discount % <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                value={form.discountPercent}
                onChange={(e) => setForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6178] mb-1 uppercase tracking-wide">
                Applies To
              </label>
              <select
                className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                value={form.appliesTo}
                onChange={(e) => setForm((f) => ({ ...f, appliesTo: e.target.value }))}
              >
                <option value="both">Events & Products</option>
                <option value="events">Events only</option>
                <option value="products">Products only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6178] mb-1 uppercase tracking-wide">
                Description (optional)
              </label>
              <input
                className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Summer sale promo"
                maxLength={120}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <label className="text-sm text-[#1E2A5A] font-medium">Active</label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.active ? "bg-[#1E2A5A]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-[#5A6178]">{form.active ? "Enabled" : "Disabled"}</span>
            </div>
          </div>

          {saveError && (
            <p className="mt-3 text-sm text-red-600">{saveError}</p>
          )}

          <div className="flex items-center gap-2 mt-5">
            <Button
              className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Code"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
        {loading && codes.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">Loading…</div>
        ) : codes.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">
            No discount codes yet. Create one above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold text-[#1E2A5A]">
                    {c.code}
                  </TableCell>
                  <TableCell className="text-[#5A6178]">{c.discountPercent}% off</TableCell>
                  <TableCell className="text-[#5A6178]">{appliesToLabel(c.appliesTo)}</TableCell>
                  <TableCell className="text-[#5A6178] max-w-[200px] truncate">
                    {c.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {c.active ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        className="h-8 w-8 p-0 text-[#5A6178] hover:text-[#1E2A5A]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(c.id)}
                        className="h-8 w-8 p-0 text-[#5A6178] hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Code usage / redemptions */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-medium text-[#1E2A5A] uppercase tracking-wider">Code Usage</h3>
            <p className="text-xs text-[#9A8F7E] mt-0.5">
              Each row is a code used by an email. Reset one to let that email use the code again (e.g. for testing).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9A8F7E]" />
              <input
                value={redemptionQuery}
                onChange={(e) => setRedemptionQuery(e.target.value)}
                placeholder="Search email or code…"
                className="h-8 pl-8 pr-3 text-sm rounded-md border border-[#E2DBCD] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 w-52"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadRedemptions()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {redemptionsError && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {redemptionsError}
          </div>
        )}

        <div className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
          {(() => {
            const q = redemptionQuery.trim().toLowerCase();
            const visible = q
              ? redemptions.filter((r) => r.email.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
              : redemptions;
            if (visible.length === 0) {
              return (
                <div className="py-10 text-center text-sm text-[#9A8F7E]">
                  {redemptions.length === 0
                    ? "No codes have been used yet."
                    : "No usage matches your search."}
                </div>
              );
            }
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reset</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm text-[#1E2A5A]">{r.code}</TableCell>
                      <TableCell className="text-sm text-[#5A6178]">{r.email}</TableCell>
                      <TableCell>
                        {r.paidAt ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Used {new Date(r.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            Checkout started
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleResetRedemption(r)}
                          disabled={resettingId === r.id}
                          className="h-8 px-2 text-[#5A6178] hover:text-[#1E2A5A]"
                          title={`Allow ${r.email} to use ${r.code} again`}
                        >
                          {resettingId === r.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RotateCcw className="w-3.5 h-3.5" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
