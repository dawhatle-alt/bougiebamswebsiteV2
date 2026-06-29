import { useState, useEffect, useCallback, useRef } from "react";
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
  ImageIcon,
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

const CATEGORIES = ["Tiles", "Mats", "Storage", "Accessories"];

interface ApiProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  imagePath?: string | null;
}

interface ProductForm {
  sku: string;
  name: string;
  description: string;
  price: string;
  category: string;
  inStock: boolean;
}

const EMPTY_FORM: ProductForm = {
  sku: "",
  name: "",
  description: "",
  price: "",
  category: CATEGORIES[0],
  inStock: true,
};

interface Props {
  onAuthError: () => void;
}

function resolveDisplayImage(sku: string, imagePath?: string | null): string | null {
  if (imagePath) return `${API_BASE}/api/storage${imagePath}`;
  const meta = productMeta[sku];
  return meta?.images?.[0] ?? null;
}

export default function ProductManager({ onAuthError }: Props) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
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
      const res = await fetch(`${API_BASE}/api/products`);
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

      const saveRes = await fetch(
        `${API_BASE}/api/admin/product-images/${encodeURIComponent(sku)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imagePath: objectPath }),
        },
      );
      if (saveRes.status === 401) { onAuthError(); return; }
      if (!saveRes.ok) throw new Error("Image uploaded but could not save.");

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, imagePath: objectPath } : p))
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const img = resolveDisplayImage(p.sku, p.imagePath);
                const isUploading = uploading === p.sku;
                const isSuccess = successSku === p.sku;
                return (
                  <TableRow key={p.id}>
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
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          p.inStock ? "bg-[#1E2A5A]" : "bg-[#D0CCBF]"
                        }`}
                        title={p.inStock ? "In stock — click to mark out of stock" : "Out of stock — click to mark in stock"}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                            p.inStock ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                  form.inStock ? "bg-[#1E2A5A]" : "bg-[#D0CCBF]"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                    form.inStock ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm text-[#5A6178]">{form.inStock ? "In stock" : "Out of stock"}</span>
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
