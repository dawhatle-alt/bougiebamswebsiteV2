import { useState, useEffect } from "react";
import { ApiBlogPost } from "@/data/blog";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UseBlogPostsResult {
  posts: ApiBlogPost[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseBlogPostResult {
  post: ApiBlogPost | null;
  loading: boolean;
  error: string | null;
}

let cache: ApiBlogPost[] | null = null;
let cachePromise: Promise<ApiBlogPost[]> | null = null;

async function fetchPosts(): Promise<ApiBlogPost[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetch(`${API_BASE}/api/blog`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load posts");
        return res.json();
      })
      .then((data: { posts: ApiBlogPost[] }) => {
        const posts = data.posts ?? [];
        cache = posts;
        return posts;
      })
      .catch((err) => {
        cachePromise = null;
        throw err;
      });
  }
  return cachePromise;
}

export function useBlogPosts(): UseBlogPostsResult {
  const [posts, setPosts] = useState<ApiBlogPost[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (cache) {
      setPosts(cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPosts()
      .then((p) => {
        if (!cancelled) { setPosts(p); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load posts");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tick]);

  const refetch = () => {
    cache = null;
    cachePromise = null;
    setTick((t) => t + 1);
  };

  return { posts, loading, error, refetch };
}

export function useBlogPost(slug: string): UseBlogPostResult {
  const { posts, loading, error } = useBlogPosts();
  const post = slug ? posts.find((p) => p.slug === slug) ?? null : null;
  return { post, loading, error };
}
