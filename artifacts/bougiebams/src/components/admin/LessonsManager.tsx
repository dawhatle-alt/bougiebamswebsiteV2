import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, RefreshCw, Trash2, ExternalLink } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORY_SUGGESTIONS = [
  "Getting Started",
  "Tile Types",
  "Rules & Scoring",
  "The Charleston",
  "Strategy & Tips",
  "Etiquette",
  "Advanced Play",
];

interface Lesson {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  category: string;
  sortOrder: number;
  published: boolean;
  createdAt: string;
}

interface FormState {
  id: number | null;
  title: string;
  description: string;
  videoUrl: string;
  category: string;
  sortOrder: number;
  published: boolean;
}

const emptyForm: FormState = {
  id: null,
  title: "",
  description: "",
  videoUrl: "",
  category: "Getting Started",
  sortOrder: 0,
  published: false,
};

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const v = u.pathname.split("/").filter(Boolean).pop();
      if (v) return `https://player.vimeo.com/video/${v}`;
    }
  } catch {}
  return null;
}

export default function LessonsManager({ onAuthError }: { onAuthError: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/lessons`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      const data = await res.json();
      setLessons(data.lessons ?? []);
    } catch {
      setError("Could not load lessons.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  function openNew() {
    setForm({ ...emptyForm, sortOrder: lessons.length });
    setError("");
    setShowForm(true);
  }

  function openEdit(l: Lesson) {
    setForm({
      id: l.id,
      title: l.title,
      description: l.description,
      videoUrl: l.videoUrl,
      category: l.category,
      sortOrder: l.sortOrder,
      published: l.published,
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm);
    setError("");
  }

  async function handleSave() {
    if (!form.title.trim() || !form.videoUrl.trim()) {
      setError("Title and Video URL are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = form.id
        ? `${API_BASE}/api/admin/lessons/${form.id}`
        : `${API_BASE}/api/admin/lessons`;
      const res = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          videoUrl: form.videoUrl.trim(),
          category: form.category.trim(),
          sortOrder: form.sortOrder,
          published: form.published,
        }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Save failed");
      closeForm();
      await load();
    } catch {
      setError("Could not save lesson. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this lesson? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/lessons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      await load();
    } catch {
      setError("Could not delete lesson.");
    } finally {
      setDeletingId(null);
    }
  }

  const embedUrl = form.videoUrl ? getEmbedUrl(form.videoUrl) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-[#1E2A5A]">
            {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
          </h2>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <Button
          className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          onClick={openNew}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Lesson
        </Button>
      </div>

      {error && !showForm && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-md border border-[#E2DBCD] bg-white p-6 space-y-5">
          <h3 className="text-base font-medium text-[#1E2A5A]">
            {form.id ? "Edit Lesson" : "New Lesson"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#5A6178] uppercase tracking-wide">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. How to Set Up the Tiles"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#5A6178] uppercase tracking-wide">Category</label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Category"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A6178] uppercase tracking-wide">Video URL *</label>
            <Input
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            />
            {form.videoUrl && !embedUrl && (
              <p className="text-xs text-amber-600">
                Paste a YouTube or Vimeo URL to embed the video.
              </p>
            )}
          </div>

          {embedUrl && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#5A6178] uppercase tracking-wide">Preview</label>
              <div className="aspect-video w-full max-w-md rounded overflow-hidden border border-[#E2DBCD]">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A6178] uppercase tracking-wide">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this lesson covers…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#5A6178] uppercase tracking-wide">Sort Order</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                min={0}
              />
              <p className="text-xs text-[#5A6178]">Lower numbers appear first.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#5A6178] uppercase tracking-wide">Visibility</label>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, published: !f.published }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.published ? "bg-[#1E2A5A]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      form.published ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-[#5A6178]">
                  {form.published ? "Published" : "Draft"}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : form.id ? "Save Changes" : "Add Lesson"}
            </Button>
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
        {loading && lessons.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">Loading…</div>
        ) : lessons.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">
            No lessons yet. Add your first video lesson above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-[#5A6178] text-xs">{l.sortOrder}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#1E2A5A] text-sm">{l.title}</p>
                      {l.description && (
                        <p className="text-xs text-[#5A6178] mt-0.5 line-clamp-1">{l.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-[#F0EDE6] text-[#5A6178] px-2 py-0.5 rounded">
                      {l.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        l.published
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {l.published ? "Published" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={l.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-[#5A6178] hover:text-[#1E2A5A] transition-colors"
                        title="Open video"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => openEdit(l)}
                        className="p-1.5 text-[#5A6178] hover:text-[#1E2A5A] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        disabled={deletingId === l.id}
                        className="p-1.5 text-[#5A6178] hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
