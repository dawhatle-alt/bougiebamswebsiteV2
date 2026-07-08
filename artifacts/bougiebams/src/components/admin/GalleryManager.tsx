import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Loader2, RefreshCw, GripVertical, ImageIcon, Check, X, Pencil, Star } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface GalleryPhoto {
  id: number;
  url: string;
  caption: string | null;
  eventId: number | null;
  isCover: boolean;
  sortOrder: number;
}

interface EventOption {
  id: number;
  title: string;
  date: string;
}

interface Props {
  onAuthError: () => void;
}

export default function GalleryManager({ onAuthError }: Props) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadEventId, setUploadEventId] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [galleryRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE}/api/gallery`),
        fetch(`${API_BASE}/api/admin/events`, { credentials: "include" }),
      ]);
      if (eventsRes.status === 401 || eventsRes.status === 403) { onAuthError(); return; }
      if (!galleryRes.ok) throw new Error("Failed to load");
      const data = await galleryRes.json() as { photos: GalleryPhoto[] };
      setPhotos(data.photos ?? []);
      if (eventsRes.ok) {
        const evData = await eventsRes.json() as { events: { id: number; title: string; date: string }[] };
        const sorted = (evData.events ?? [])
          .map((e) => ({ id: e.id, title: e.title, date: e.date }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setEvents(sorted);
      }
    } catch {
      setError("Could not load gallery photos.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  function eventTitle(id: number | null): string {
    if (id === null) return "";
    return events.find((e) => e.id === id)?.title ?? `Event #${id}`;
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const urlRes = await fetch(`${API_BASE}/api/admin/storage/upload-url?ext=${ext}`, {
          method: "POST",
          credentials: "include",
        });
        if (urlRes.status === 401 || urlRes.status === 403) { onAuthError(); return; }
        if (!urlRes.ok) throw new Error("Could not get upload URL.");
        const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };

        const putRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });
        if (!putRes.ok) throw new Error("Upload failed.");

        const saveRes = await fetch(`${API_BASE}/api/admin/gallery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            objectPath,
            eventId: uploadEventId ? Number(uploadEventId) : null,
          }),
        });
        if (saveRes.status === 401 || saveRes.status === 403) { onAuthError(); return; }
        if (!saveRes.ok) throw new Error("Photo uploaded but could not save.");
        const { photo } = await saveRes.json() as { photo: GalleryPhoto };
        setPhotos((prev) => [...prev, photo]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function patchPhoto(id: number, body: Record<string, unknown>): Promise<GalleryPhoto | null> {
    const res = await fetch(`${API_BASE}/api/admin/gallery/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) { onAuthError(); return null; }
    if (!res.ok) throw new Error("Save failed.");
    const { photo } = await res.json() as { photo: GalleryPhoto };
    return photo;
  }

  async function assignEvent(id: number, value: string) {
    setBusyId(id);
    setError("");
    try {
      const photo = await patchPhoto(id, { eventId: value ? Number(value) : null });
      if (photo) setPhotos((prev) => prev.map((p) => (p.id === id ? photo : p)));
    } catch {
      setError("Could not update the photo's event.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCover(photo: GalleryPhoto) {
    if (photo.eventId === null) return;
    setBusyId(photo.id);
    setError("");
    try {
      const updated = await patchPhoto(photo.id, { isCover: !photo.isCover });
      if (updated) {
        setPhotos((prev) =>
          prev.map((p) => {
            if (p.id === updated.id) return updated;
            // Only one cover per event — the server un-crowns siblings.
            if (updated.isCover && p.eventId === updated.eventId) return { ...p, isCover: false };
            return p;
          })
        );
      }
    } catch {
      setError("Could not update the cover photo.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this photo from the gallery?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/gallery/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Delete failed.");
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Could not delete photo.");
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(photo: GalleryPhoto) {
    setEditingId(photo.id);
    setEditCaption(photo.caption ?? "");
  }

  async function saveCaption(id: number) {
    setSavingCaption(true);
    try {
      const photo = await patchPhoto(id, { caption: editCaption });
      if (photo) {
        setPhotos((prev) => prev.map((p) => (p.id === id ? photo : p)));
        setEditingId(null);
      }
    } catch {
      setError("Could not save caption.");
    } finally {
      setSavingCaption(false);
    }
  }

  function handleDragStart(id: number) { setDragId(id); }

  function handleDragOver(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    if (dragId === null || dragId === targetId) return;
    setPhotos((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleDragEnd() {
    setDragId(null);
    const order = photos.map((p, i) => ({ id: p.id, sortOrder: i }));
    await fetch(`${API_BASE}/api/admin/gallery/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ order }),
    });
  }

  const visiblePhotos = photos.filter((p) => {
    if (filter === "all") return true;
    if (filter === "unassigned") return p.eventId === null;
    return p.eventId === Number(filter);
  });

  const selectClass =
    "h-8 rounded-md border border-[#E2DBCD] bg-white px-2 text-xs text-[#1E2A5A] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-medium text-[#1E2A5A]">Event Gallery</h2>
          <p className="text-sm text-[#5A6178] mt-0.5">
            Photos appear in the "From the Table" section on the Events page. Assign photos to an
            event to build that event's album; star one photo as the album cover.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <select
            className={selectClass}
            value={uploadEventId}
            onChange={(e) => setUploadEventId(e.target.value)}
            aria-label="Assign new uploads to event"
            title="New uploads are assigned to this event"
          >
            <option value="">Uploads: no event (general)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>Uploads → {e.title}</option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <Button
            size="sm"
            className="bg-[#1E2A5A] text-white hover:bg-[#172248]"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploading ? "Uploading…" : "Upload Photos"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#5A6178]">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading…
        </div>
      ) : photos.length === 0 ? (
        <div
          className="border-2 border-dashed border-[#E2DBCD] rounded-xl py-20 flex flex-col items-center justify-center text-[#5A6178] cursor-pointer hover:border-[#D4AF37]/60 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="w-12 h-12 mb-4 text-[#C5BBAC]" />
          <p className="font-serif text-lg mb-1">No gallery photos yet</p>
          <p className="text-sm">Click here or use Upload Photos to add your first shots.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs text-[#5A6178] flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              Drag cards to reorder — the gallery reflects this order.
            </p>
            <select
              className={selectClass}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter photos by event"
            >
              <option value="all">Show: all photos ({photos.length})</option>
              <option value="unassigned">
                Show: no event ({photos.filter((p) => p.eventId === null).length})
              </option>
              {events.map((e) => {
                const count = photos.filter((p) => p.eventId === e.id).length;
                return (
                  <option key={e.id} value={e.id}>Show: {e.title} ({count})</option>
                );
              })}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visiblePhotos.map((photo) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(photo.id)}
                onDragOver={(e) => handleDragOver(e, photo.id)}
                onDragEnd={() => void handleDragEnd()}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  dragId === photo.id ? "opacity-50 scale-95" : ""
                } ${photo.isCover ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/40" : "border-[#E2DBCD]"}`}
              >
                <div className="relative group aspect-[4/3] bg-[#FAF7F0]">
                  <img
                    src={photo.url}
                    alt={photo.caption ?? "Gallery photo"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing bg-black/40 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  {photo.eventId !== null && (
                    <button
                      onClick={() => void toggleCover(photo)}
                      disabled={busyId === photo.id}
                      className={`absolute top-2 right-2 rounded-full p-1.5 transition-colors ${
                        photo.isCover
                          ? "bg-[#D4AF37] text-white"
                          : "bg-black/40 text-white/80 opacity-0 group-hover:opacity-100 hover:text-[#D4AF37]"
                      }`}
                      aria-label={photo.isCover ? "Album cover (click to remove)" : "Make album cover"}
                      title={photo.isCover ? "Album cover — click to remove" : "Make this the album cover"}
                    >
                      {busyId === photo.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Star className="w-3.5 h-3.5" fill={photo.isCover ? "currentColor" : "none"} />}
                    </button>
                  )}
                  {photo.isCover && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-[#D4AF37] text-white text-[10px] font-semibold tracking-wide px-2 py-0.5">
                      COVER
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <select
                    className={`${selectClass} w-full`}
                    value={photo.eventId ?? ""}
                    onChange={(e) => void assignEvent(photo.id, e.target.value)}
                    disabled={busyId === photo.id}
                    aria-label={`Event for photo ${photo.id}`}
                  >
                    <option value="">No event (general)</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>

                  {editingId === photo.id ? (
                    <div className="flex gap-1.5">
                      <Input
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="Add a caption…"
                        className="h-7 text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveCaption(photo.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-7 w-7 p-0 bg-[#1E2A5A] text-white hover:bg-[#172248]"
                        onClick={() => void saveCaption(photo.id)}
                        disabled={savingCaption}
                      >
                        {savingCaption ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p
                        className="text-xs text-[#5A6178] flex-1 truncate cursor-pointer hover:text-[#1E2A5A] transition-colors"
                        onClick={() => startEdit(photo)}
                        title={photo.caption ?? "Click to add caption"}
                      >
                        {photo.caption ? (
                          <span className="italic">{photo.caption}</span>
                        ) : (
                          <span className="text-[#C5BBAC]">No caption — click to add</span>
                        )}
                      </p>
                      <button
                        onClick={() => startEdit(photo)}
                        className="text-[#C5BBAC] hover:text-[#5A6178] transition-colors flex-shrink-0"
                        aria-label="Edit caption"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => void handleDelete(photo.id)}
                        disabled={deletingId === photo.id}
                        className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label="Delete photo"
                      >
                        {deletingId === photo.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
