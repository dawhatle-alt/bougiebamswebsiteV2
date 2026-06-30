import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Loader2, RefreshCw, GripVertical, ImageIcon } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface HeroImage {
  id: number;
  objectPath: string;
  position: number;
}

interface Props {
  onAuthError: () => void;
}

export default function HeroImagesManager({ onAuthError }: Props) {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/hero-images`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { images: HeroImage[] };
      setImages(data.images ?? []);
    } catch {
      setError("Could not load hero images.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const urlRes = await fetch(
          `${API_BASE}/api/admin/storage/upload-url?ext=${ext}`,
          { method: "POST", credentials: "include" }
        );
        if (urlRes.status === 401) { onAuthError(); return; }
        if (!urlRes.ok) throw new Error("Could not get upload URL.");
        const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };

        const putRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
          credentials: "include",
        });
        if (!putRes.ok) throw new Error("Upload failed.");

        const saveRes = await fetch(`${API_BASE}/api/admin/hero-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ objectPath, position: images.length }),
        });
        if (saveRes.status === 401) { onAuthError(); return; }
        if (!saveRes.ok) throw new Error("Image uploaded but could not save.");
        const { image } = await saveRes.json() as { image: HeroImage };
        setImages((prev) => [...prev, image]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/hero-images/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) { onAuthError(); return; }
      if (!res.ok) throw new Error("Delete failed.");
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch {
      setError("Could not delete image.");
    } finally {
      setDeletingId(null);
    }
  }

  async function saveOrder(newImages: HeroImage[]) {
    const order = newImages.map((img, i) => ({ id: img.id, position: i }));
    await fetch(`${API_BASE}/api/admin/hero-images/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ order }),
    });
  }

  function handleDragStart(id: number) {
    setDragId(id);
  }

  function handleDragOver(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    if (dragId === null || dragId === targetId) return;
    setImages((prev) => {
      const fromIdx = prev.findIndex((img) => img.id === dragId);
      const toIdx = prev.findIndex((img) => img.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  function handleDragEnd() {
    setDragId(null);
    void saveOrder(images);
  }

  const sorted = [...images].sort((a, b) => a.position - b.position);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-medium text-[#1E2A5A]">Homepage Background Images</h2>
          <p className="text-sm text-[#5A6178] mt-0.5">
            {images.length === 0
              ? "No custom images — homepage uses default photos. Upload images to override."
              : `${images.length} image${images.length !== 1 ? "s" : ""} · drag to reorder`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload Images
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div
          className="rounded-xl border-2 border-dashed border-[#E2DBCD] bg-white py-20 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#D4AF37] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 rounded-full bg-[#F5F0EA] flex items-center justify-center">
            <ImageIcon className="w-7 h-7 text-[#D4AF37]" />
          </div>
          <p className="text-[#5A6178] font-medium">Click to upload images</p>
          <p className="text-sm text-[#5A6178]/70">JPG, PNG, WebP supported · multiple at once</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sorted.map((img) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(img.id)}
              onDragOver={(e) => handleDragOver(e, img.id)}
              onDragEnd={handleDragEnd}
              className={`group relative rounded-xl overflow-hidden border border-[#E2DBCD] bg-white aspect-square cursor-grab active:cursor-grabbing shadow-sm transition-opacity ${
                dragId === img.id ? "opacity-40" : "opacity-100"
              }`}
            >
              <img
                src={`${API_BASE}/api/storage${img.objectPath}`}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-5 h-5 text-white drop-shadow" />
              </div>
              <button
                onClick={() => void handleDelete(img.id)}
                disabled={deletingId === img.id}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId === img.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}

          <div
            className="rounded-xl border-2 border-dashed border-[#E2DBCD] bg-white aspect-square flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#D4AF37] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-[#D4AF37]" />
                <span className="text-xs text-[#5A6178]">Add more</span>
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-[#5A6178]/70">
        Changes apply immediately. The homepage shuffles through all uploaded images. Minimum 6 recommended for the best effect.
      </p>
    </div>
  );
}
