import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// The promo card image in the Shop megamenu. Both cards shared one stock photo
// before this, so neither looked like its own feature.

type CardKey = "tablescape" | "buildYourSet";

interface Props {
  card: CardKey;
  title: string;
  hint: string;
  onAuthError: () => void;
}

export default function MenuCardImage({ card, title, hint, onAuthError }: Props) {
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shop-menu-cards`);
      if (res.ok) {
        const d = await res.json() as Record<CardKey, string | null>;
        setPath(d[card] ?? null);
      }
    } catch {
      // non-fatal — the card just falls back to the default photo
    } finally {
      setLoading(false);
    }
  }, [card]);

  useEffect(() => { void load(); }, [load]);

  async function save(next: string | null) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/shop-menu-cards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [card]: next ?? "" }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("save failed");
      setPath(next);
    } catch {
      setError("Could not save the image.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const presign = await fetch(`${API_BASE}/api/admin/storage/upload-url`, {
        method: "POST",
        credentials: "include",
      });
      if (presign.status === 401 || presign.status === 403) { onAuthError(); return; }
      if (!presign.ok) throw new Error("no upload url");
      const { uploadURL, objectPath } = await presign.json() as { uploadURL: string; objectPath: string };
      const put = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");
      await save(objectPath);
    } catch {
      setError("Upload failed. Please try again.");
      setBusy(false);
    }
  }

  const url = path ? `${API_BASE}/api/storage${path}` : null;

  return (
    <div className="rounded-md border border-[#E2DBCD] bg-white p-5">
      <div className="text-sm font-medium text-[#1E2A5A]">{title}</div>
      <p className="text-xs text-[#9A8F7E] mt-0.5 mb-3 max-w-xl">{hint}</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />

      {loading ? (
        <div className="h-40 flex items-center justify-center text-[#9A8F7E]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="flex items-start gap-4 flex-wrap">
          <div className="relative w-64 aspect-[4/3] rounded-md overflow-hidden bg-[#F5F0EA] border border-[#E2DBCD]">
            {url ? (
              <>
                <img src={url} alt="" className="w-full h-full object-cover" />
                {/* Mirrors the live card so the crop and text placement are judged here */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E2A5A]/80 via-[#1E2A5A]/15 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 text-white">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-[#E8C86A]">Preview</span>
                  <p className="font-serif text-lg leading-tight">{title.replace(" card image", "")}</p>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#9A8F7E] text-center px-4">
                Using the default photo
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-[#1E2A5A] px-3 py-2 text-sm font-medium text-[#FAF7F0] hover:bg-[#172248] disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {url ? "Replace image" : "Upload image"}
            </button>
            {url && (
              <button
                onClick={() => void save(null)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs text-[#5A6178] hover:text-red-600 disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" /> Remove (use default)
              </button>
            )}
            <p className="text-[11px] text-[#9A8F7E] max-w-[14rem]">
              Landscape works best — roughly 1200×900. The bottom third is covered by the title, so keep the subject
              in the upper two-thirds.
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
