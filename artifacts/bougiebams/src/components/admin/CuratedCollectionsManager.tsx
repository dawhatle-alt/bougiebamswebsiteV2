import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Trash2, Plus, ImagePlus, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  onAuthError: () => void;
}

interface Item {
  _key: number;
  title: string;
  imagePath: string;
  imageUrl: string;
  linkPath: string;
}

let keyCounter = 0;
const nextKey = () => ++keyCounter;

export default function CuratedCollectionsManager({ onAuthError }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/curated-collections`);
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { items: Omit<Item, "_key">[] };
      setItems((data.items ?? []).map((i) => ({ ...i, _key: nextKey() })));
    } catch {
      setError("Could not load the curated collections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function update(key: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { _key: nextKey(), title: "", imagePath: "", imageUrl: "", linkPath: "/shop" }]);
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((it) => it._key !== key));
  }

  function move(key: number, dir: -1 | 1) {
    setItems((prev) => {
      const i = prev.findIndex((it) => it._key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleUpload(key: number, file: File) {
    setUploadingKey(key);
    setError("");
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const urlRes = await fetch(`${API_BASE}/api/admin/storage/upload-url?ext=${ext}`, {
        method: "POST",
        credentials: "include",
      });
      if (urlRes.status === 401 || urlRes.status === 403) { onAuthError(); return; }
      if (!urlRes.ok) throw new Error("Could not get upload URL.");
      const { uploadURL, objectPath } = (await urlRes.json()) as { uploadURL: string; objectPath: string };

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed. Please try again.");

      update(key, { imagePath: objectPath, imageUrl: `/api/storage${objectPath}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleSave() {
    // Every card needs an image; blank titles/links are allowed but flag missing images.
    if (items.some((it) => !it.imagePath)) {
      setError("Every collection needs an image before saving.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/curated-collections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: items.map(({ title, imagePath, linkPath }) => ({ title: title.trim(), imagePath, linkPath: linkPath.trim() })),
        }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { items: Omit<Item, "_key">[] };
      setItems((data.items ?? []).map((i) => ({ ...i, _key: nextKey() })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <p className="text-sm text-[#5A6178] max-w-xl">
          These cards appear in the <strong>Curated Collections</strong> section on the homepage. Set each card's image, title,
          and where it links to. If you remove all cards, the homepage shows the built-in defaults.
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={saving}>
          <RefreshCw className="w-4 h-4 mr-2" /> Reload
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-4">
        {items.map((it, idx) => (
          <div key={it._key} className="rounded-md border border-[#E2DBCD] bg-white p-4 flex gap-4">
            <div className="w-28 flex-shrink-0">
              <div className="aspect-[3/4] rounded-md overflow-hidden bg-[#FAF7F0] border border-[#E2DBCD] flex items-center justify-center">
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.title || "Collection"} className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="w-6 h-6 text-[#C5BBAC]" />
                )}
              </div>
              <input
                ref={(el) => { fileInputs.current[it._key] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(it._key, f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                disabled={uploadingKey === it._key}
                onClick={() => fileInputs.current[it._key]?.click()}
              >
                {uploadingKey === it._key
                  ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  : <ImagePlus className="w-3 h-3 mr-1" />}
                {it.imageUrl ? "Replace" : "Upload"}
              </Button>
            </div>

            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#5A6178]">Title</label>
                <Input
                  value={it.title}
                  onChange={(e) => update(it._key, { title: e.target.value })}
                  placeholder="The Jade Collection"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#5A6178]">Links to</label>
                <Input
                  value={it.linkPath}
                  onChange={(e) => update(it._key, { linkPath: e.target.value })}
                  placeholder="/shop?category=Complete+Sets"
                />
                <p className="text-[11px] text-[#9A8F7E]">A path on the site, e.g. <code>/shop</code> or <code>/shop?category=Tiles+%26+Accessories</code></p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => move(it._key, -1)}
                disabled={idx === 0}
                className="text-[#9A8F7E] hover:text-[#1E2A5A] disabled:opacity-30 transition-colors"
                title="Move up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => move(it._key, 1)}
                disabled={idx === items.length - 1}
                className="text-[#9A8F7E] hover:text-[#1E2A5A] disabled:opacity-30 transition-colors"
                title="Move down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeItem(it._key)}
                className="text-[#9A8F7E] hover:text-red-600 transition-colors mt-1"
                title="Remove collection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-5">
        <Button variant="outline" onClick={addItem} disabled={items.length >= 12}>
          <Plus className="w-4 h-4 mr-2" /> Add collection
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : null}
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
