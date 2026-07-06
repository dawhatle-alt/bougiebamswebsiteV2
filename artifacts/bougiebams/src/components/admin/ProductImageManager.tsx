import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, RefreshCw, Upload, X } from "lucide-react";
import { productMeta } from "@/data/products";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ApiProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  imagePath?: string | null;
}

interface Props {
  onAuthError: () => void;
}

export default function ProductImageManager({ onAuthError }: Props) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successSku, setSuccessSku] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSkuRef = useRef<string | null>(null);

  const authHeaders: Record<string, string> = {};

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prodRes, imgRes] = await Promise.all([
        fetch(`${API_BASE}/api/products`),
        fetch(`${API_BASE}/api/admin/product-images`, { headers: authHeaders, credentials: "include" }),
      ]);
      if (imgRes.status === 401 || imgRes.status === 403) { onAuthError(); return; }
      if (!prodRes.ok || !imgRes.ok) throw new Error("Load failed");
      const [prodData, imgData] = await Promise.all([
        prodRes.json() as Promise<{ products: ApiProduct[] }>,
        imgRes.json() as Promise<{ images: Record<string, string> }>,
      ]);
      setProducts(prodData.products ?? []);
      setImageOverrides(imgData.images ?? {});
    } catch {
      setError("Could not load products. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  function resolveDisplayImage(sku: string): string | null {
    const override = imageOverrides[sku];
    if (override) return `${API_BASE}/api/storage${override}`;
    const meta = productMeta[sku];
    return meta?.images?.[0] ?? null;
  }

  async function handleUpload(file: File, sku: string) {
    setUploading(sku);
    setUploadError(null);
    setSuccessSku(null);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const presignRes = await fetch(`${API_BASE}/api/admin/storage/upload-url?ext=${encodeURIComponent(ext)}`, {
        method: "POST",
        headers: authHeaders,
        credentials: "include",
      });
      if (presignRes.status === 401) { onAuthError(); return; }
      if (!presignRes.ok) throw new Error("Could not get upload URL.");
      const { uploadURL, objectPath } = await presignRes.json() as {
        uploadURL: string;
        objectPath: string;
      };

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
          headers: { ...authHeaders, "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imagePath: objectPath }),
        },
      );
      if (saveRes.status === 401) { onAuthError(); return; }
      if (!saveRes.ok) throw new Error("Image uploaded but could not save.");

      setImageOverrides((prev) => ({ ...prev, [sku]: objectPath }));
      setSuccessSku(sku);
      setTimeout(() => setSuccessSku(null), 3000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function handleRemoveOverride(sku: string) {
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/product-images/${encodeURIComponent(sku)}`,
        { method: "DELETE", headers: authHeaders, credentials: "include" },
      );
      if (res.status === 401) { onAuthError(); return; }
      setImageOverrides((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
    } catch {
      setUploadError("Could not remove the image override.");
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-[#5A6178]">Loading products…</div>;
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={load} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-[#5A6178]">
        No products found. Make sure your Square catalog is connected.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-medium text-[#1E2A5A]">Product Images</h2>
          <p className="text-sm text-[#5A6178] mt-0.5">
            Upload a photo for any product. Changes appear on the site immediately.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
          if (file && sku) void handleUpload(file, sku);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const displayImage = resolveDisplayImage(product.sku);
          const hasOverride = !!imageOverrides[product.sku];
          const isUploading = uploading === product.sku;
          const isSuccess = successSku === product.sku;

          return (
            <div key={product.sku} className="rounded-lg border border-[#E2DBCD] bg-white overflow-hidden">
              <div className="relative aspect-square bg-[#F5F0EA]">
                {displayImage ? (
                  <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-[#C5BCA8]" />
                  </div>
                )}
                {hasOverride && (
                  <button
                    onClick={() => void handleRemoveOverride(product.sku)}
                    title="Revert to default image"
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow text-[#5A6178] hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {isSuccess && (
                  <div className="absolute inset-0 bg-[#1E2A5A]/60 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Saved!</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="font-medium text-[#1E2A5A] text-sm leading-tight truncate">{product.name}</p>
                <p className="text-xs text-[#9A8F7E] mt-0.5 truncate">
                  SKU: {product.sku || "—"}
                  {hasOverride && <span className="ml-2 text-[#D4AF37]">● Custom</span>}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 text-xs"
                  disabled={isUploading}
                  onClick={() => {
                    pendingSkuRef.current = product.sku;
                    fileInputRef.current?.click();
                  }}
                >
                  {isUploading ? (
                    <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Uploading…</>
                  ) : (
                    <><Upload className="w-3 h-3 mr-1.5" />{hasOverride ? "Replace image" : "Upload image"}</>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
