import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { SHOP_CATEGORIES } from "@/data/categories";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  GalleryHorizontal,
  ImageIcon,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { productMeta } from "@/data/products";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Single source of truth: the same categories the storefront navigation shows.
// Assigning a product to one of these is what places it in that shop section.
const CATEGORIES = SHOP_CATEGORIES.map((c) => c.name);

interface ProductTab {
  enabled: boolean;
  content: string;
}

interface ProductTabs {
  details?: ProductTab;
  care?: ProductTab;
  shipping?: ProductTab;
}

const TAB_DEFS: { key: keyof ProductTabs; label: string }[] = [
  { key: "details", label: "Product Details" },
  { key: "care", label: "Care Instructions" },
  { key: "shipping", label: "Shipping & Returns" },
];

interface ApiProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  published: boolean;
  buildYourSet: boolean;
  shippingIncluded: boolean;
  imagePath?: string | null;
  tabs?: ProductTabs | null;
}

interface ProductForm {
  sku: string;
  name: string;
  description: string;
  price: string;
  category: string;
  inStock: boolean;
  shippingIncluded: boolean;
  tabs: Record<keyof ProductTabs, ProductTab>;
}

function normalizeTabs(tabs?: ProductTabs | null): Record<keyof ProductTabs, ProductTab> {
  return {
    details: { enabled: tabs?.details?.enabled ?? true, content: tabs?.details?.content ?? "" },
    care: { enabled: tabs?.care?.enabled ?? true, content: tabs?.care?.content ?? "" },
    shipping: { enabled: tabs?.shipping?.enabled ?? true, content: tabs?.shipping?.content ?? "" },
  };
}

const EMPTY_FORM: ProductForm = {
  sku: "",
  name: "",
  description: "",
  price: "",
  category: CATEGORIES[0],
  inStock: true,
  shippingIncluded: false,
  tabs: normalizeTabs(null),
};

interface Props {
  onAuthError: () => void;
}

function resolveDisplayImage(sku: string, imagePath?: string | null): string | null {
  if (imagePath) return `${API_BASE}/api/storage${imagePath}`;
  const meta = productMeta[sku];
  return meta?.images?.[0] ?? null;
}

interface GalleryImage {
  id: number;
  imagePath: string;
  sortOrder: number;
}

// Per-product photo gallery editor: upload multiple photos, arrange their
// order (first photo = main image everywhere), remove. Expands under the
// product's row.
function GalleryEditor({
  productId,
  onAuthError,
  onPrimaryChange,
}: {
  productId: string;
  onAuthError: () => void;
  onPrimaryChange: (imagePath: string | null) => void;
}) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = useCallback(
    (list: GalleryImage[]) => {
      setImages(list);
      onPrimaryChange(list[0]?.imagePath ?? null);
    },
    [onPrimaryChange],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(productId)}/images`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { images: GalleryImage[] };
      setImages(data.images);
    } catch {
      setError("Could not load this product's photos.");
    } finally {
      setLoading(false);
    }
  }, [productId, onAuthError]);

  useEffect(() => { void load(); }, [load]);

  async function addPhoto(file: File) {
    setBusy(true);
    setError("");
    try {
      const presignRes = await fetch(`${API_BASE}/api/admin/storage/upload-url`, {
        method: "POST",
        credentials: "include",
      });
      if (presignRes.status === 401) { onAuthError(); return; }
      if (!presignRes.ok) throw new Error("Could not get upload URL.");
      const { uploadURL, objectPath } = (await presignRes.json()) as { uploadURL: string; objectPath: string };
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed — please try again.");
      const saveRes = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(productId)}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imagePath: objectPath }),
      });
      if (saveRes.status === 401) { onAuthError(); return; }
      if (!saveRes.ok) throw new Error("Uploaded but could not save.");
      const data = (await saveRes.json()) as { image: GalleryImage };
      apply([...images, data.image]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    apply(next);
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(productId)}/images/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: next.map((i) => i.id) }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
    } catch {
      setError("Could not save the new order.");
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(imageId: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(productId)}/images/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      apply(images.filter((i) => i.id !== imageId));
    } catch {
      setError("Could not remove the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-3 px-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5A6178]">
          Photo Gallery
          <span className="ml-2 font-normal normal-case tracking-normal text-[#9A8F7E]">
            First photo is the main image on the shop, feed, and link previews. Use the arrows to arrange.
          </span>
        </p>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-[#9A8F7E]" />}
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#9A8F7E]" /></div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.id} className="w-24">
              <div className="relative w-24 h-24 rounded-md overflow-hidden bg-[#F5F0EA] border border-[#E2DBCD]">
                <img src={`${API_BASE}/api/storage${img.imagePath}?w=200`} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-[#1E2A5A] text-white text-[9px] font-medium px-1.5 py-0.5 rounded">Main</span>
                )}
                <button
                  type="button"
                  onClick={() => void remove(img.id)}
                  disabled={busy}
                  title="Remove photo"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/85 hover:bg-white flex items-center justify-center shadow disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              </div>
              <div className="flex justify-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => void move(i, -1)}
                  disabled={busy || i === 0}
                  title="Move earlier"
                  className="p-1 text-[#5A6178] hover:text-[#1E2A5A] disabled:opacity-30"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void move(i, 1)}
                  disabled={busy || i === images.length - 1}
                  title="Move later"
                  className="p-1 text-[#5A6178] hover:text-[#1E2A5A] disabled:opacity-30"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-24 h-24 rounded-md border-2 border-dashed border-[#C5BCA8] hover:border-[#1E2A5A] flex flex-col items-center justify-center gap-1 text-[#9A8F7E] hover:text-[#1E2A5A] transition-colors disabled:opacity-50"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-[10px] font-medium">Add Photo</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void addPhoto(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function ProductManager({ onAuthError }: Props) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [galleryFor, setGalleryFor] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successSku, setSuccessSku] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSkuRef = useRef<string | null>(null);
  const pendingProductIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/products`, { credentials: "include" });
      if (!res.ok) throw new Error("Load failed");
      const data = await res.json() as { products: ApiProduct[] };
      setProducts(data.products ?? []);
    } catch {
      setError("Could not load products. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(p: ApiProduct) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description,
      price: String(p.price),
      category: p.category,
      inStock: p.inStock,
      shippingIncluded: p.shippingIncluded,
      tabs: normalizeTabs(p.tabs),
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave() {
    const priceNum = parseFloat(form.price);
    if (!form.sku.trim()) { setFormError("SKU is required."); return; }
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (isNaN(priceNum) || priceNum < 0) { setFormError("Enter a valid price."); return; }

    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            price: priceNum,
            category: form.category,
            inStock: form.inStock,
            shippingIncluded: form.shippingIncluded,
            tabs: form.tabs,
          }),
        });
        if (res.status === 401 || res.status === 403) { onAuthError(); return; }
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Save failed");
        }
        const { product } = await res.json() as { product: ApiProduct };
        setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      } else {
        const res = await fetch(`${API_BASE}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sku: form.sku.trim(),
            name: form.name.trim(),
            description: form.description.trim(),
            price: priceNum,
            category: form.category,
            inStock: form.inStock,
            shippingIncluded: form.shippingIncluded,
            tabs: form.tabs,
          }),
        });
        if (res.status === 401 || res.status === 403) { onAuthError(); return; }
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Create failed");
        }
        const { product } = await res.json() as { product: ApiProduct };
        setProducts((prev) => [...prev, product]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch {
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleInStockToggle(p: ApiProduct) {
    const updated = { ...p, inStock: !p.inStock };
    setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    try {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inStock: !p.inStock }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) {
        setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      }
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    }
  }

  async function handlePublishedToggle(p: ApiProduct) {
    const updated = { ...p, published: !p.published };
    setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    try {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ published: !p.published }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) {
        setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      }
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    }
  }

  async function handleBuildYourSetToggle(p: ApiProduct) {
    const updated = { ...p, buildYourSet: !p.buildYourSet };
    setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    try {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ buildYourSet: !p.buildYourSet }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) {
        setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      }
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    }
  }

  async function handleUpload(file: File, sku: string, productId: string) {
    setUploading(sku);
    setUploadError(null);
    setSuccessSku(null);
    try {
      const presignRes = await fetch(`${API_BASE}/api/admin/storage/upload-url`, {
        method: "POST",
        credentials: "include",
      });
      if (presignRes.status === 401) { onAuthError(); return; }
      if (!presignRes.ok) throw new Error("Could not get upload URL.");
      const { uploadURL, objectPath } = await presignRes.json() as { uploadURL: string; objectPath: string };

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed — please try again.");

      // Append to the product's gallery (the legacy per-sku PUT wiped every
      // other photo). If this is the first photo, it becomes the main image.
      const saveRes = await fetch(
        `${API_BASE}/api/admin/products/${encodeURIComponent(productId)}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imagePath: objectPath }),
        },
      );
      if (saveRes.status === 401) { onAuthError(); return; }
      if (!saveRes.ok) throw new Error("Image uploaded but could not save.");

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, imagePath: p.imagePath ?? objectPath } : p))
      );
      setSuccessSku(sku);
      setTimeout(() => setSuccessSku(null), 3000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-[#5A6178]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading products…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-medium text-[#1E2A5A]">Products</h2>
          <p className="text-sm text-[#5A6178] mt-0.5">{products.length} product{products.length !== 1 ? "s" : ""} in the shop</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            onClick={openAdd}
            className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-4 text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const sku = pendingSkuRef.current;
          const id = pendingProductIdRef.current;
          if (file && sku && id) void handleUpload(file, sku, id);
          e.target.value = "";
        }}
      />

      <div className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
        {products.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">
            No products yet. Add your first product above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">In Stock</TableHead>
                <TableHead className="text-center">Visible</TableHead>
                <TableHead className="text-center">Build Set</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const img = resolveDisplayImage(p.sku, p.imagePath);
                const isUploading = uploading === p.sku;
                const isSuccess = successSku === p.sku;
                return (
                  <Fragment key={p.id}>
                  <TableRow>
                    <TableCell>
                      <div
                        className="relative w-10 h-10 rounded overflow-hidden bg-[#F5F0EA] flex-shrink-0 cursor-pointer group"
                        title="Click to upload image"
                        onClick={() => {
                          pendingSkuRef.current = p.sku;
                          pendingProductIdRef.current = p.id;
                          fileInputRef.current?.click();
                        }}
                      >
                        {img ? (
                          <img src={img} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-[#C5BCA8]" />
                          </div>
                        )}
                        {isUploading ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 text-white animate-spin" />
                          </div>
                        ) : isSuccess ? (
                          <div className="absolute inset-0 bg-[#1E2A5A]/60 flex items-center justify-center">
                            <span className="text-white text-[8px] font-medium">Saved</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                            <Upload className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-[#1E2A5A] text-sm">{p.name}</p>
                      <p className="text-xs text-[#9A8F7E]">SKU: {p.sku}</p>
                    </TableCell>
                    <TableCell className="text-sm text-[#5A6178]">{p.category}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-[#1E2A5A]">
                      ${p.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => void handleInStockToggle(p)}
                        className={`relative inline-flex items-center px-0.5 w-10 h-5 rounded-full transition-colors ${
                          p.inStock ? "bg-[#1E2A5A]" : "bg-[#D0CCBF]"
                        }`}
                        title={p.inStock ? "In stock — click to mark out of stock" : "Out of stock — click to mark in stock"}
                      >
                        <span
                          className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                            p.inStock ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => void handlePublishedToggle(p)}
                        className={`relative inline-flex items-center px-0.5 w-10 h-5 rounded-full transition-colors ${
                          p.published ? "bg-emerald-500" : "bg-[#D0CCBF]"
                        }`}
                        title={p.published ? "Visible on site — click to hide" : "Hidden from site — click to show"}
                      >
                        <span
                          className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                            p.published ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => void handleBuildYourSetToggle(p)}
                        className={`relative inline-flex items-center px-0.5 w-10 h-5 rounded-full transition-colors ${
                          p.buildYourSet ? "bg-emerald-500" : "bg-[#D0CCBF]"
                        }`}
                        title={p.buildYourSet ? "Shown in Build Your Set — click to exclude" : "Excluded from Build Your Set — click to include"}
                      >
                        <span
                          className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                            p.buildYourSet ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 hover:text-[#1E2A5A] ${galleryFor === p.id ? "text-[#1E2A5A] bg-[#F5F0EA]" : "text-[#5A6178]"}`}
                          onClick={() => setGalleryFor(galleryFor === p.id ? null : p.id)}
                          title="Manage photo gallery"
                        >
                          <GalleryHorizontal className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[#5A6178] hover:text-[#1E2A5A]"
                          onClick={() => openEdit(p)}
                          title="Edit product"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[#5A6178] hover:text-red-600"
                          onClick={() => setDeleteId(p.id)}
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {galleryFor === p.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-[#FAF7F0]">
                        <GalleryEditor
                          productId={p.id}
                          onAuthError={onAuthError}
                          onPrimaryChange={(imagePath) =>
                            setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, imagePath } : x)))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1E2A5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {editing ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {!editing && (
              <div>
                <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">SKU *</label>
                <input
                  className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E2A5A]"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="e.g. tiles_newset"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Name *</label>
              <input
                className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E2A5A]"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Product name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Description</label>
              <textarea
                className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E2A5A] resize-none"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short product description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Price ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E2A5A]"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1">Category</label>
                <select
                  className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E2A5A] bg-white"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, inStock: !f.inStock }))}
                className={`relative inline-flex items-center px-0.5 w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  form.inStock ? "bg-[#1E2A5A]" : "bg-[#D0CCBF]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                    form.inStock ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-[#5A6178]">{form.inStock ? "In stock" : "Out of stock"}</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, shippingIncluded: !f.shippingIncluded }))}
                className={`relative inline-flex items-center px-0.5 w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-4 ${
                  form.shippingIncluded ? "bg-emerald-500" : "bg-[#D0CCBF]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                    form.shippingIncluded ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-[#5A6178]">
                {form.shippingIncluded ? "Shipping included in price" : "Standard shipping"}
              </span>
            </div>

            <div className="border-t border-[#E2DBCD] pt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-[#5A6178] uppercase tracking-wider">Detail Page Tabs</p>
                <p className="text-xs text-[#9A8F7E] mt-0.5">
                  Shown as tabs below the product. A tab that is switched off or left empty is hidden.
                </p>
              </div>
              {TAB_DEFS.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          tabs: { ...f.tabs, [key]: { ...f.tabs[key], enabled: !f.tabs[key].enabled } },
                        }))
                      }
                      className={`relative inline-flex items-center px-0.5 w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                        form.tabs[key].enabled ? "bg-emerald-500" : "bg-[#D0CCBF]"
                      }`}
                      aria-label={`${label} tab ${form.tabs[key].enabled ? "enabled" : "disabled"}`}
                    >
                      <span
                        className={`w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${
                          form.tabs[key].enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-medium text-[#5A6178] uppercase tracking-wider">{label}</span>
                    {!form.tabs[key].enabled && (
                      <span className="text-[10px] text-[#9A8F7E] uppercase tracking-wider">Hidden</span>
                    )}
                  </div>
                  <textarea
                    className="w-full border border-[#E2DBCD] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E2A5A] resize-y disabled:opacity-50 disabled:bg-[#FAF7F0]"
                    rows={3}
                    value={form.tabs[key].content}
                    disabled={!form.tabs[key].enabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        tabs: { ...f.tabs, [key]: { ...f.tabs[key], content: e.target.value } },
                      }))
                    }
                    placeholder={`${label} content — line breaks are kept. Leave empty to hide this tab.`}
                  />
                </div>
              ))}
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
              >
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : (editing ? "Save Changes" : "Add Product")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!deleting) setDeleteId(open ? deleteId : null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1E2A5A]">Delete Product?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#5A6178] mt-1">
            This will permanently remove the product from the shop. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting…</> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
