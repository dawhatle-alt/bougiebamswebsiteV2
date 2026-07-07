import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Loader2, RefreshCw, ImageIcon, Plus, Pencil, X, Check } from "lucide-react";
import { FAVORITES, CATEGORIES, type FavoriteProduct, type FavoriteCategory } from "@/data/favorites";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function AdminImagePreview({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useReducer(
    (_: "loading" | "ok" | "error", next: "loading" | "ok" | "error") => next,
    "loading"
  );
  useEffect(() => { setStatus("loading"); }, [src]);
  return (
    <div className="w-full h-full flex items-center justify-center">
      {status === "error" ? (
        <div className="flex flex-col items-center gap-1 text-[#C5BBAC]">
          <ImageIcon className="w-8 h-8" />
          <span className="text-[10px]">Image unavailable — re-upload</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-contain transition-opacity duration-200 ${status === "ok" ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
        />
      )}
    </div>
  );
}

interface CustomProduct {
  id: string;
  dbId: number;
  name: string;
  category: string;
  description: string;
  affiliateUrl: string;
  image: string | null;
}

interface Props {
  onAuthError: () => void;
}

async function getUploadUrl(ext: string, onAuthError: () => void): Promise<{ uploadURL: string; objectPath: string } | null> {
  const res = await fetch(`${API_BASE}/api/admin/storage/upload-url?ext=${ext}`, {
    method: "POST",
    credentials: "include",
  });
  if (res.status === 401 || res.status === 403) { onAuthError(); return null; }
  if (!res.ok) throw new Error("Could not get upload URL.");
  return res.json() as Promise<{ uploadURL: string; objectPath: string }>;
}

async function uploadFile(file: File, onAuthError: () => void): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const slot = await getUploadUrl(ext, onAuthError);
  if (!slot) return null;
  const putRes = await fetch(slot.uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload failed.");
  return slot.objectPath;
}

export default function FavoritesManager({ onAuthError }: Props) {
  const [tab, setTab] = useState<"static" | "custom">("static");
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<FavoriteCategory | "All">("All");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CustomProduct | null>(null);
  const [formData, setFormData] = useState({ name: "", category: CATEGORIES[0], description: "", affiliateUrl: "" });
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const formFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [imgRes, customRes] = await Promise.all([
        fetch(`${API_BASE}/api/favorites/images`),
        fetch(`${API_BASE}/api/favorites/custom-products`),
      ]);
      if (imgRes.ok) {
        const d = await imgRes.json() as { images: Record<string, string> };
        setImageMap(d.images ?? {});
      }
      if (customRes.ok) {
        const d = await customRes.json() as { products: CustomProduct[] };
        setCustomProducts(d.products ?? []);
      }
    } catch {
      setError("Could not load favorites data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleStaticImageUpload(productId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingId(productId);
    setError("");
    try {
      const file = files[0];
      const objectPath = await uploadFile(file, onAuthError);
      if (!objectPath) return;
      const res = await fetch(`${API_BASE}/api/admin/favorites/${encodeURIComponent(productId)}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectPath }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Could not save image.");
      const d = await res.json() as { imageUrl: string };
      setImageMap((prev) => ({ ...prev, [productId]: d.imageUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleStaticImageDelete(productId: string) {
    setDeletingId(productId);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/favorites/${encodeURIComponent(productId)}/image`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Delete failed.");
      setImageMap((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } catch {
      setError("Could not remove image.");
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(p: CustomProduct) {
    setEditingProduct(p);
    setFormData({ name: p.name, category: p.category, description: p.description, affiliateUrl: p.affiliateUrl });
    setFormImage(null);
    setFormImagePreview(p.image);
    setShowForm(true);
  }

  function openAdd() {
    setEditingProduct(null);
    setFormData({ name: "", category: CATEGORIES[0], description: "", affiliateUrl: "" });
    setFormImage(null);
    setFormImagePreview(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
    setFormImage(null);
    setFormImagePreview(null);
  }

  function handleFormFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFormImage(file);
    if (file) {
      setFormImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      let objectPath: string | null | undefined = undefined;
      if (formImage) {
        objectPath = await uploadFile(formImage, onAuthError);
        if (objectPath === null) return;
      }

      if (editingProduct) {
        const body: Record<string, unknown> = { ...formData };
        if (objectPath !== undefined) body.objectPath = objectPath;
        const res = await fetch(`${API_BASE}/api/admin/favorites/custom-products/${editingProduct.dbId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (res.status === 401 || res.status === 403) { onAuthError(); return; }
        if (!res.ok) throw new Error("Update failed.");
      } else {
        const body: Record<string, unknown> = { ...formData };
        if (objectPath !== undefined) body.objectPath = objectPath;
        const res = await fetch(`${API_BASE}/api/admin/favorites/custom-products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (res.status === 401 || res.status === 403) { onAuthError(); return; }
        if (!res.ok) throw new Error("Create failed.");
      }

      await load();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCustomDelete(dbId: number) {
    if (!confirm("Delete this product?")) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/favorites/custom-products/${dbId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Delete failed.");
      setCustomProducts((prev) => prev.filter((p) => p.dbId !== dbId));
    } catch {
      setError("Could not delete product.");
    }
  }

  const visibleStatic: FavoriteProduct[] = activeCategory === "All"
    ? FAVORITES
    : FAVORITES.filter((p) => p.category === activeCategory);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-medium text-[#1E2A5A]">Favorites Manager</h2>
          <p className="text-sm text-[#5A6178] mt-0.5">Upload photos for existing products or add new custom items.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-[#1E2A5A] text-white hover:bg-[#172248]"
            onClick={() => { setTab("custom"); openAdd(); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-1 border-b border-[#E2DBCD] mb-6">
        {(["static", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-[#D4AF37] text-[#1E2A5A]" : "border-transparent text-[#5A6178] hover:text-[#1E2A5A]"
            }`}
          >
            {t === "static" ? `Catalog Products (${FAVORITES.length})` : `Custom Products (${customProducts.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#5A6178]">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading…
        </div>
      ) : tab === "static" ? (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {(["All", ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as FavoriteCategory | "All")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? "bg-[#1E2A5A] text-white border-[#1E2A5A]"
                    : "border-[#E2DBCD] text-[#5A6178] hover:border-[#1E2A5A]/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleStatic.map((product) => {
              const overrideUrl = imageMap[product.id];
              const currentImageUrl = overrideUrl ?? `${import.meta.env.BASE_URL}${product.image.replace(/^\//, "")}`;
              const hasOverride = !!overrideUrl;
              const isUploading = uploadingId === product.id;
              const isDeleting = deletingId === product.id;

              return (
                <div key={product.id} className="bg-white border border-[#E2DBCD] rounded-lg overflow-hidden">
                  <div className="relative aspect-[4/3] bg-[#FAF7F0] flex items-center justify-center group">
                    <AdminImagePreview src={currentImageUrl} alt={product.name} />
                    {hasOverride && (
                      <span className="absolute top-2 right-2 bg-[#1E2A5A] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Custom
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-xs text-[#5A6178] uppercase tracking-wider mb-0.5">{product.category}</p>
                    <p className="text-sm font-medium text-[#1E2A5A] mb-3 leading-snug">{product.name}</p>

                    <div className="flex gap-2">
                      <input
                        ref={(el) => { fileInputRefs.current[product.id] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void handleStaticImageUpload(product.id, e.target.files)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8"
                        disabled={isUploading || isDeleting}
                        onClick={() => fileInputRefs.current[product.id]?.click()}
                      >
                        {isUploading ? (
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3 mr-1.5" />
                        )}
                        {hasOverride ? "Replace" : "Upload"}
                      </Button>

                      {hasOverride && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-red-500 border-red-200 hover:bg-red-50"
                          disabled={isDeleting || isUploading}
                          onClick={() => void handleStaticImageDelete(product.id)}
                          title="Remove custom image"
                        >
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {showForm && (
            <div className="mb-6 bg-white border border-[#E2DBCD] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-[#1E2A5A]">
                  {editingProduct ? "Edit Product" : "New Custom Product"}
                </h3>
                <button onClick={closeForm} className="text-[#5A6178] hover:text-[#1E2A5A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fav-name">Name *</Label>
                    <Input
                      id="fav-name"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Product name"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fav-category">Category *</Label>
                    <select
                      id="fav-category"
                      value={formData.category}
                      onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      required
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fav-desc">Description</Label>
                  <Input
                    id="fav-desc"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Short description"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fav-url">Affiliate URL</Label>
                  <Input
                    id="fav-url"
                    value={formData.affiliateUrl}
                    onChange={(e) => setFormData((p) => ({ ...p, affiliateUrl: e.target.value }))}
                    placeholder="https://amzn.to/..."
                    type="url"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Image</Label>
                  <div className="flex items-start gap-4">
                    {formImagePreview ? (
                      <div className="relative w-24 h-24 rounded-md overflow-hidden border border-[#E2DBCD] flex-shrink-0">
                        <img src={formImagePreview} alt="preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                          onClick={() => { setFormImage(null); setFormImagePreview(null); }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-md border border-dashed border-[#E2DBCD] flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-[#C5BBAC]" />
                      </div>
                    )}
                    <div>
                      <input
                        ref={formFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFormFileChange}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => formFileRef.current?.click()}
                      >
                        <Upload className="w-3 h-3 mr-2" />
                        Choose Image
                      </Button>
                      <p className="text-xs text-[#5A6178] mt-1">JPG, PNG, WebP</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#1E2A5A] text-white hover:bg-[#172248]"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {editingProduct ? "Save Changes" : "Add Product"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={closeForm} disabled={submitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {customProducts.length === 0 ? (
            <div className="text-center py-16 text-[#5A6178]">
              <ImageIcon className="w-10 h-10 mx-auto mb-3 text-[#C5BBAC]" />
              <p className="font-serif text-lg mb-1">No custom products yet</p>
              <p className="text-sm">Add products that aren't in the main catalog.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customProducts.map((p) => (
                <div key={p.id} className="bg-white border border-[#E2DBCD] rounded-lg overflow-hidden">
                  <div className="aspect-[4/3] bg-[#FAF7F0] flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-[#C5BBAC]" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[#5A6178] uppercase tracking-wider mb-0.5">{p.category}</p>
                    <p className="text-sm font-medium text-[#1E2A5A] mb-1 leading-snug">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-[#5A6178] line-clamp-2 mb-3">{p.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => openEdit(p)}>
                        <Pencil className="w-3 h-3 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => void handleCustomDelete(p.dbId)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
