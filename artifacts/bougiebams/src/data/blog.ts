import defaultBlogImage from "@assets/images/mahjong-lifestyle.png";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface ApiBlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  imagePath: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// Resolve a stored object path (e.g. "/objects/uploads/abc") to a public URL.
// Falls back to a bundled brand image when a post has no cover.
export function blogImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return defaultBlogImage;
  return `${API_BASE}/api/storage${imagePath}`;
}

export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}
