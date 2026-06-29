import { useListBlogPosts } from "@workspace/api-client-react";
import { ApiBlogPost } from "@/data/blog";

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

export function useBlogPosts(): UseBlogPostsResult {
  const { data, isLoading, isError, error, refetch } = useListBlogPosts();

  const posts: ApiBlogPost[] = (data?.posts ?? []).map(
    (p) => p as unknown as ApiBlogPost,
  );

  return {
    posts,
    loading: isLoading,
    error: isError ? (error instanceof Error ? error.message : "Failed to load posts") : null,
    refetch,
  };
}

export function useBlogPost(slug: string): UseBlogPostResult {
  const { posts, loading, error } = useBlogPosts();
  const post = slug ? (posts.find((p) => p.slug === slug) ?? null) : null;
  return { post, loading, error };
}
