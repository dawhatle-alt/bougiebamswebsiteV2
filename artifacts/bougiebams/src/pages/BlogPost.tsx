import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useBlogPost } from "@/hooks/useBlogPosts";
import { blogImageUrl, formatBlogDate } from "@/data/blog";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";
  const { post, loading, error } = useBlogPost(slug);

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8 max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to the Journal
        </Link>

        {loading && (
          <div className="py-24 text-center text-muted-foreground font-serif text-lg">
            Loading…
          </div>
        )}

        {!loading && (error || !post) && (
          <div className="py-24 text-center">
            <h1 className="font-serif text-4xl mb-4">Story not found</h1>
            <p className="text-muted-foreground font-serif text-lg">
              This story may have been removed.{" "}
              <Link href="/blog" className="text-primary underline">
                Browse the Journal
              </Link>
              .
            </p>
          </div>
        )}

        {!loading && !error && post && (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-primary font-semibold tracking-widest uppercase text-xs">
              {post.category}
            </span>
            <h1 className="font-serif text-4xl md:text-5xl mt-4 mb-6">
              {post.title}
            </h1>
            <div className="flex items-center justify-between pb-8 mb-8 border-b border-border">
              <span className="text-sm font-sans tracking-wide">
                {post.author}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatBlogDate(post.createdAt)}
              </span>
            </div>

            <div className="aspect-[16/9] overflow-hidden rounded-md bg-muted mb-10">
              <img
                src={blogImageUrl(post.imagePath)}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>

            {post.excerpt && (
              <p className="font-serif text-xl leading-relaxed text-muted-foreground mb-8">
                {post.excerpt}
              </p>
            )}

            <div className="font-serif text-lg leading-relaxed whitespace-pre-line">
              {post.content}
            </div>
          </motion.article>
        )}
      </div>
    </div>
  );
}
