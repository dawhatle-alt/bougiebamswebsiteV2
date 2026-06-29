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
import { ImagePlus, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ApiBlogPost, blogImageUrl, formatBlogDate } from "@/data/blog";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORY_SUGGESTIONS = [
  "Style",
  "How to Play",
  "Entertaining",
  "Gift Guides",
  "Behind the Brand",
];

interface FormState {
  id: number | null;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  published: boolean;
  imagePath: string | null;
}

const emptyForm: FormState = {
  id: null,
  title: "",
  excerpt: "",
  content: "",
  category: "",
  author: "BougieBams",
  published: true,
  imagePath: null,
};

interface BlogManagerProps {
  onAuthError: () => void;
}

export default function BlogManager({ onAuthError }: BlogManagerProps) {
  const [posts, setPosts] = useState<ApiBlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function authHeaders(json = false): Record<string, string> {
    return json ? { "Content-Type": "application/json" } : {};
  }

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/blog`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (res.status === 401) {
        onAuthError();
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      setLoadError("Could not load posts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  function startCreate() {
    setFormError("");
    setForm({ ...emptyForm });
  }

  function startEdit(post: ApiBlogPost) {
    setFormError("");
    setForm({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      author: post.author,
      published: post.published,
      imagePath: post.imagePath,
    });
  }

  function closeForm() {
    setForm(null);
    setFormError("");
  }

  async function handleUpload(file: File) {
    if (!form) return;
    setUploading(true);
    setFormError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/storage/upload-url`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
      });
      if (res.status === 401) {
        onAuthError();
        return;
      }
      if (!res.ok) throw new Error("upload-url failed");
      const { uploadURL, objectPath } = await res.json();
      const put = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
        credentials: "include",
      });
      if (!put.ok) throw new Error("PUT failed");
      setForm((prev) => (prev ? { ...prev, imagePath: objectPath } : prev));
    } catch {
      setFormError("Image upload failed. Please try a different file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!form) return;
    if (!form.title.trim()) {
      setFormError("Please add a title.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const isEdit = form.id !== null;
      const url = isEdit
        ? `${API_BASE}/api/admin/blog/${form.id}`
        : `${API_BASE}/api/admin/blog`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          category: form.category,
          author: form.author,
          published: form.published,
          imagePath: form.imagePath,
        }),
      });
      if (res.status === 401) {
        onAuthError();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Save failed");
      }
      closeForm();
      await loadPosts();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save the post.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(post: ApiBlogPost) {
    if (
      !window.confirm(
        `Delete "${post.title}"? This permanently removes the post and can't be undone.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/blog/${post.id}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      });
      if (res.status === 401) {
        onAuthError();
        return;
      }
      if (!res.ok) throw new Error("delete failed");
      if (form?.id === post.id) closeForm();
      await loadPosts();
    } catch {
      setLoadError("Could not delete the post. Please try again.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <span className="text-lg font-medium text-[#1E2A5A]">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadPosts()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={startCreate}
            className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New post
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {form && (
        <div className="mb-6 rounded-md border border-[#E2DBCD] bg-white p-6">
          <h2
            className="text-xl text-[#1E2A5A] mb-4"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {form.id !== null ? "Edit post" : "New post"}
          </h2>

          <div className="grid gap-4">
            <label className="block">
              <span className="text-sm text-[#1E2A5A]">Title</span>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Post title"
                className="mt-1"
              />
            </label>

            <label className="block">
              <span className="text-sm text-[#1E2A5A]">Excerpt</span>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="A short summary shown on the blog list"
                rows={2}
                className="mt-1 w-full rounded-md border border-[#E2DBCD] bg-white px-3 py-2 text-sm text-[#1E2A5A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </label>

            <label className="block">
              <span className="text-sm text-[#1E2A5A]">Content</span>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write the full post here…"
                rows={8}
                className="mt-1 w-full rounded-md border border-[#E2DBCD] bg-white px-3 py-2 text-sm text-[#1E2A5A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-[#1E2A5A]">Category</span>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Entertaining"
                  list="blog-categories"
                  className="mt-1"
                />
                <datalist id="blog-categories">
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="text-sm text-[#1E2A5A]">Author</span>
                <Input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  placeholder="Author name"
                  className="mt-1"
                />
              </label>
            </div>

            <div>
              <span className="text-sm text-[#1E2A5A]">Cover image</span>
              <div className="mt-1 flex items-center gap-4">
                <div className="h-20 w-28 overflow-hidden rounded-md border border-[#E2DBCD] bg-[#FAF7F0]">
                  <img
                    src={blogImageUrl(form.imagePath)}
                    alt="Cover preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading…" : "Upload image"}
                  </Button>
                  {form.imagePath && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imagePath: null })}
                      className="text-xs text-[#5A6178] underline text-left"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="h-4 w-4 accent-[#1E2A5A]"
              />
              <span className="text-sm text-[#1E2A5A]">
                Published (visible on the public blog)
              </span>
            </label>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex items-center gap-3">
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
              >
                {saving ? "Saving…" : "Save post"}
              </Button>
              <Button variant="ghost" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white overflow-hidden">
        {loading && posts.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-[#5A6178]">
            No posts yet. Click "New post" to write your first one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium text-[#1E2A5A]">
                    {post.title}
                  </TableCell>
                  <TableCell className="text-[#5A6178]">{post.category}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                        post.published
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#5A6178]">
                    {formatBlogDate(post.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(post)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(post)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
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
