import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImagePlus, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { ApiEvent, EventCategory } from "@/data/events";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORIES: Exclude<EventCategory, "All">[] = [
  "In-Person",
  "Virtual",
  "Tournament",
  "Workshop",
];

interface FormState {
  id: number | null;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  isFree: boolean;
  priceDollars: string;
  category: Exclude<EventCategory, "All">;
  host: string;
  totalSpots: string;
  spotsLeft: string;
  published: boolean;
  imagePath: string | null;
}

const emptyForm: FormState = {
  id: null,
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  isFree: true,
  priceDollars: "",
  category: "In-Person",
  host: "BougieBams",
  totalSpots: "0",
  spotsLeft: "0",
  published: true,
  imagePath: null,
};

function eventToForm(e: ApiEvent): FormState {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date,
    time: e.time,
    location: e.location,
    isFree: e.priceCents === null,
    priceDollars: e.priceCents === null ? "" : String(e.priceCents / 100),
    category: e.category as Exclude<EventCategory, "All">,
    host: e.host,
    totalSpots: String(e.totalSpots),
    spotsLeft: String(e.spotsLeft),
    published: e.published,
    imagePath: e.imagePath ?? null,
  };
}

interface Props {
  token: string;
  onAuthError: () => void;
}

export default function EventsManager({ token, onAuthError }: Props) {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/events`, {
        headers: authHeaders,
      });
      if (res.status === 401) { onAuthError(); return; }
      if (!res.ok) throw new Error("Load failed");
      const data = await res.json() as { events: ApiEvent[] };
      setEvents(data.events ?? []);
    } catch {
      setLoadError("Could not load events. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => f ? { ...f, [key]: value } : f);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const presignRes = await fetch(`${API_BASE}/api/admin/storage/upload-url`, {
        method: "POST", headers: authHeaders,
      });
      if (presignRes.status === 401) { onAuthError(); return; }
      if (!presignRes.ok) throw new Error("Could not get upload URL.");
      const { uploadURL, objectPath } = await presignRes.json() as {
        uploadURL: string; objectPath: string;
      };
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed. Please try again.");
      field("imagePath", objectPath);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form) return;
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!form.date.trim()) { setFormError("Date is required."); return; }
    setSaving(true);
    setFormError("");
    const priceCents = form.isFree
      ? null
      : Math.round(parseFloat(form.priceDollars || "0") * 100) || 0;
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date.trim(),
      time: form.time.trim(),
      location: form.location.trim(),
      priceCents,
      category: form.category,
      host: form.host.trim(),
      totalSpots: parseInt(form.totalSpots) || 0,
      spotsLeft: parseInt(form.spotsLeft) || 0,
      published: form.published,
      imagePath: form.imagePath,
    };
    const isEdit = form.id !== null;
    const url = isEdit
      ? `${API_BASE}/api/admin/events/${form.id}`
      : `${API_BASE}/api/admin/events`;
    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { onAuthError(); return; }
      const data = await res.json() as { event?: ApiEvent; error?: string };
      if (!res.ok) { setFormError(data.error ?? "Save failed."); return; }
      if (data.event) {
        setEvents((prev) =>
          isEdit
            ? prev.map((e) => e.id === data.event!.id ? data.event! : e)
            : [data.event!, ...prev],
        );
      }
      setForm(null);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${id}`, {
        method: "DELETE", headers: authHeaders,
      });
      if (res.status === 401) { onAuthError(); return; }
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function formatPrice(e: ApiEvent) {
    return e.priceCents === null ? "Free" : `$${(e.priceCents / 100).toFixed(0)}`;
  }

  if (form !== null) {
    const imageUrl = form.imagePath
      ? `${API_BASE}/api/storage${form.imagePath}`
      : null;

    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setForm(null)} className="text-[#5A6178]">
            ← Back
          </Button>
          <h2 className="text-lg font-medium text-[#1E2A5A]">
            {form.id ? "Edit Event" : "New Event"}
          </h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Title *</label>
            <Input value={form.title} onChange={(e) => field("title", e.target.value)} placeholder="Cocktails & Tiles: A Summer Game Night" />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
              placeholder="Describe the event…"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Date *</label>
              <Input value={form.date} onChange={(e) => field("date", e.target.value)} placeholder="July 19, 2025" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Time</label>
              <Input value={form.time} onChange={(e) => field("time", e.target.value)} placeholder="7:00 PM – 10:00 PM" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Location</label>
            <Input value={form.location} onChange={(e) => field("location", e.target.value)} placeholder="The Soho Grand Hotel, New York, NY" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => field("category", e.target.value as Exclude<EventCategory, "All">)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Host</label>
              <Input value={form.host} onChange={(e) => field("host", e.target.value)} placeholder="BougieBams NYC" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-2">Price</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={(e) => field("isFree", e.target.checked)}
                  className="rounded"
                />
                Free event
              </label>
            </div>
            {!form.isFree && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#5A6178]">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.priceDollars}
                  onChange={(e) => field("priceDollars", e.target.value)}
                  placeholder="85"
                  className="w-32"
                />
                <span className="text-sm text-[#5A6178]">per person</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Total Spots</label>
              <Input type="number" min="0" value={form.totalSpots} onChange={(e) => field("totalSpots", e.target.value)} placeholder="24" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Spots Left</label>
              <Input type="number" min="0" value={form.spotsLeft} onChange={(e) => field("spotsLeft", e.target.value)} placeholder="24" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-2">Cover Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
                e.target.value = "";
              }}
            />
            {imageUrl && (
              <div className="relative mb-2 w-full aspect-video rounded-md overflow-hidden bg-[#F5F0EA]">
                <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
                <button
                  onClick={() => field("imagePath", null)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow"
                >
                  <X className="w-3.5 h-3.5 text-[#5A6178]" />
                </button>
              </div>
            )}
            {uploadError && <p className="text-sm text-red-600 mb-2">{uploadError}</p>}
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="w-4 h-4 mr-2" />
              {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
            </Button>
          </div>

          <div className="flex items-center gap-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#1E2A5A]">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => field("published", e.target.checked)}
                className="rounded"
              />
              Published (visible to the public)
            </label>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
            >
              {saving ? "Saving…" : form.id ? "Save Changes" : "Create Event"}
            </Button>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-medium text-[#1E2A5A]">Events</h2>
          <p className="text-sm text-[#5A6178] mt-0.5">
            {events.length} {events.length === 1 ? "event" : "events"} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setForm(emptyForm)}
            className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {deleteId !== null && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-red-700">Delete this event? This cannot be undone.</p>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => void handleDelete(deleteId)} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">
            No events yet. Click <strong>New Event</strong> to create your first one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Spots</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-[#1E2A5A] max-w-[200px] truncate">{e.title}</TableCell>
                  <TableCell className="text-[#5A6178] whitespace-nowrap">{e.date}</TableCell>
                  <TableCell className="text-[#5A6178]">{e.category}</TableCell>
                  <TableCell className="text-[#5A6178]">{formatPrice(e)}</TableCell>
                  <TableCell className="text-[#5A6178]">{e.spotsLeft}/{e.totalSpots}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {e.published ? "Live" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setForm(eventToForm(e))} className="h-8 w-8 p-0">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(e.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
