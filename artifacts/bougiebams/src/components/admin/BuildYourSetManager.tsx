import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, RefreshCw } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { SHOP_CATEGORIES } from "@/data/categories";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  onAuthError: () => void;
}

export default function BuildYourSetManager({ onAuthError }: Props) {
  const { products, loading: productsLoading } = useProducts();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/build-your-set`);
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { productIds: string[] };
      setSelected(new Set(data.productIds ?? []));
    } catch {
      setError("Could not load the current selection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Only categories that the Build Your Set page actually renders.
  const groups = useMemo(
    () =>
      SHOP_CATEGORIES.map((cat) => ({
        name: cat.name,
        items: products.filter((p) => p.category === cat.name),
      })).filter((g) => g.items.length > 0),
    [products],
  );
  const shownCount = groups.reduce((n, g) => n + g.items.length, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAll(on: boolean) {
    setSelected(on ? new Set(groups.flatMap((g) => g.items.map((p) => p.id))) : new Set());
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/build-your-set`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productIds: Array.from(selected) }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { productIds: string[] };
      setSelected(new Set(data.productIds ?? []));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || productsLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  const selectedShown = groups.reduce((n, g) => n + g.items.filter((p) => selected.has(p.id)).length, 0);

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-[#5A6178] mb-2">
        Choose which products appear as options in the <strong>Build Your Set</strong> section.
      </p>
      <p className="text-xs text-[#9A8F7E] mb-6">
        {selectedShown === 0
          ? "Nothing selected yet — the section currently shows all products. Check items below to feature a curated subset."
          : `${selectedShown} of ${shownCount} products featured.`}
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => setAll(true)}>Select all</Button>
        <Button variant="outline" size="sm" onClick={() => setAll(false)}>Clear all</Button>
        <Button variant="outline" size="sm" onClick={load} disabled={saving} className="ml-auto">
          <RefreshCw className="w-4 h-4 mr-2" /> Reload
        </Button>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.name} className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-[#FAF7F0] border-b border-[#E2DBCD] text-sm font-medium text-[#1E2A5A]">
              {group.name}
            </div>
            <div className="divide-y divide-[#F0EBE1]">
              {group.items.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#FAF7F0] transition-colors"
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                        checked ? "bg-[#1E2A5A] border-[#1E2A5A] text-white" : "border-[#D0CCBF] bg-white"
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                    />
                    <div className="w-9 h-9 rounded overflow-hidden bg-[#F5F0EA] flex-shrink-0">
                      {p.images?.[0] && (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-sm text-[#1E2A5A] flex-1">{p.name}</span>
                    <span className="text-xs text-[#9A8F7E]">${p.price}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saving} className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : null}
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
