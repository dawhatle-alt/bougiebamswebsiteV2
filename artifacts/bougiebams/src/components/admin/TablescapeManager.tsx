import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Sparkles } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  onAuthError: () => void;
}

interface Slot {
  slot: string;
  label: string;
  description: string;
  required: boolean;
}

interface AdminProduct {
  id: string;
  name: string;
  category: string;
  published: boolean;
  inStock: boolean;
  imageUrl: string | null;
  tablescapeSlot: string | null;
}

interface Generation {
  id: string;
  imageUrl: string;
  selections: Record<string, string>;
  model: string;
  durationMs: number | null;
  signedIn: boolean;
  createdAt: string;
}

import MenuCardImage from "@/components/admin/MenuCardImage";

export default function TablescapeManager({ onAuthError }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [guestLimit, setGuestLimit] = useState(3);
  const [memberLimit, setMemberLimit] = useState(20);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const settingsRes = await fetch(`${API_BASE}/api/admin/tablescape/settings`, { credentials: "include" });
      if (settingsRes.status === 401 || settingsRes.status === 403) { onAuthError(); return; }
      if (!settingsRes.ok) throw new Error("Failed");
      const settings = (await settingsRes.json()) as {
        enabled: boolean; guestLimit: number; memberLimit: number; slots: Slot[];
      };
      setEnabled(!!settings.enabled);
      setGuestLimit(settings.guestLimit);
      setMemberLimit(settings.memberLimit);
      setSlots(settings.slots ?? []);

      const productsRes = await fetch(`${API_BASE}/api/admin/tablescape/products`, { credentials: "include" });
      if (!productsRes.ok) throw new Error("Failed");
      const productData = (await productsRes.json()) as { products: AdminProduct[] };
      setProducts(productData.products ?? []);

      const gensRes = await fetch(`${API_BASE}/api/admin/tablescape/generations`, { credentials: "include" });
      if (gensRes.ok) {
        const gensData = (await gensRes.json()) as { generations: Generation[] };
        setGenerations(gensData.generations ?? []);
      }
    } catch {
      setError("Could not load the tablescape settings.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  async function handleSaveSettings() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tablescape/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled, guestLimit, memberLimit }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save the settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSlotChange(productId: string, slot: string) {
    setSavingSlot(productId);
    setError("");
    const next = slot === "" ? null : slot;
    try {
      const res = await fetch(`${API_BASE}/api/admin/tablescape/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tablescapeSlot: next }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      setProducts((current) =>
        current.map((p) => (p.id === productId ? { ...p, tablescapeSlot: next } : p)),
      );
    } catch {
      setError("Could not save that product. Please try again.");
    } finally {
      setSavingSlot(null);
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  const tagged = products.filter((p) => p.tablescapeSlot);
  const requiredCovered = slots
    .filter((s) => s.required)
    .filter((s) => tagged.some((p) => p.tablescapeSlot === s.slot && p.published && p.inStock));
  const readyToLaunch = requiredCovered.length === slots.filter((s) => s.required).length;

  return (
    <div className="max-w-4xl">
      <p className="text-sm text-[#5A6178] mb-6">
        Design Your Table lets a shopper pick a mat, tiles and accessories, then generates one photo of
        the finished table with AI. Each image costs roughly 5–7¢ of Google AI credit, so the daily
        limits below are your spending guardrails.
      </p>

      <div className="mb-6">
        <MenuCardImage
          card="tablescape"
          title="Shop menu card image"
          hint="The Design Your Table card in the Shop menu. A tablescape generated by this feature works best — it shows shoppers exactly what they get."
          onAuthError={onAuthError}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!readyToLaunch && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tag at least one in-stock, published product as <strong>Mat</strong> and one as{" "}
          <strong>Tiles</strong> below before turning this on — the builder needs both to create an image.
        </div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white p-6 space-y-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[#1E2A5A]">Show Design Your Table</div>
            <div className="text-xs text-[#9A8F7E]">
              When off, the page and every menu link are hidden from visitors.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex items-center px-0.5 w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              enabled ? "bg-emerald-500" : "bg-[#D0CCBF]"
            }`}
            title={enabled ? "Enabled — click to disable" : "Disabled — click to enable"}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-[#1E2A5A]">Free images per visitor per day</span>
            <span className="block text-xs text-[#9A8F7E] mb-2">
              Before we ask them to sign in. Set to 0 to require sign-in from the start.
            </span>
            <input
              type="number"
              min={0}
              max={50}
              value={guestLimit}
              onChange={(e) => setGuestLimit(Number(e.target.value))}
              className="w-full rounded-md border border-[#E2DBCD] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#1E2A5A]">Images per signed-in shopper per day</span>
            <span className="block text-xs text-[#9A8F7E] mb-2">
              A ceiling so one account can't run up the bill.
            </span>
            <input
              type="number"
              min={0}
              max={200}
              value={memberLimit}
              onChange={(e) => setMemberLimit(Number(e.target.value))}
              className="w-full rounded-md border border-[#E2DBCD] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : null}
            {saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </div>

      <h3 className="font-medium text-[#1E2A5A] mb-1">What each product is</h3>
      <p className="text-sm text-[#5A6178] mb-4">
        Tell the builder which position each product fills. Anything left as "Not in builder" won't
        appear. Only published, in-stock products are shown to shoppers.
      </p>

      <div className="rounded-md border border-[#E2DBCD] bg-white divide-y divide-[#F0EBE0] mb-8">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded bg-[#F7F4EC] overflow-hidden flex-shrink-0">
              {p.imageUrl && <img src={`${p.imageUrl}?w=96`} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[#1E2A5A] truncate">{p.name}</div>
              <div className="text-xs text-[#9A8F7E]">
                {p.category}
                {!p.published && " · Unpublished"}
                {!p.inStock && " · Sold out"}
              </div>
            </div>
            {savingSlot === p.id && <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />}
            <select
              value={p.tablescapeSlot ?? ""}
              onChange={(e) => handleSlotChange(p.id, e.target.value)}
              className="rounded-md border border-[#E2DBCD] px-3 py-2 text-sm bg-white min-w-[9rem]"
            >
              <option value="">Not in builder</option>
              {slots.map((s) => (
                <option key={s.slot} value={s.slot}>
                  {s.label}
                  {s.required ? " (required)" : ""}
                </option>
              ))}
            </select>
          </div>
        ))}
        {products.length === 0 && (
          <div className="p-6 text-sm text-[#9A8F7E]">No products yet.</div>
        )}
      </div>

      <h3 className="font-medium text-[#1E2A5A] mb-1 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#D4AF37]" />
        Recent tablescapes
      </h3>
      <p className="text-sm text-[#5A6178] mb-4">
        The last 60 images shoppers created — a running read on which pieces people put together.
      </p>

      {generations.length === 0 ? (
        <div className="rounded-md border border-[#E2DBCD] bg-white p-6 text-sm text-[#9A8F7E]">
          No tablescapes yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {generations.map((g) => (
            <figure key={g.id} className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
              <img src={`${g.imageUrl}?w=600`} alt="" loading="lazy" className="w-full aspect-[3/2] object-cover" />
              <figcaption className="p-3 text-xs text-[#9A8F7E]">
                {new Date(g.createdAt).toLocaleDateString()} · {Object.keys(g.selections).length} pieces
                {g.signedIn ? " · signed in" : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
