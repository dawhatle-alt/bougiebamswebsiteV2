import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { blogPosts } from "@/data/blog";

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  
  const categories = ["All", "Style", "How to Play", "Entertaining", "Gift Guides", "Behind the Brand"];
  
  const filteredPosts = activeCategory === "All" 
    ? blogPosts 
    : blogPosts.filter(p => p.category === activeCategory);

  const featuredPost = blogPosts[0];
  const gridPosts = filteredPosts.filter(p => p.id !== featuredPost.id || activeCategory !== "All");

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl mb-6">The Journal</h1>
          <p className="text-muted-foreground font-serif text-xl max-w-2xl mx-auto">
            Musings on lifestyle, entertaining, and the beautiful game.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-16 border-b border-border pb-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`font-sans text-sm tracking-widest uppercase pb-4 -mb-[17px] border-b-2 transition-colors ${
                activeCategory === category 
                  ? "border-primary text-foreground font-semibold" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Post (Only show on 'All') */}
        {activeCategory === "All" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-24 group block cursor-pointer"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-border">
              <div className="aspect-[4/3] lg:aspect-auto overflow-hidden">
                <img 
                  src={featuredPost.image} 
                  alt={featuredPost.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8 md:p-16 flex flex-col justify-center bg-card">
                <span className="text-primary font-semibold tracking-widest uppercase text-xs mb-4">
                  {featuredPost.category}
                </span>
                <h2 className="font-serif text-4xl md:text-5xl mb-6 group-hover:text-primary transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground font-serif text-lg leading-relaxed mb-8">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center justify-between mt-auto pt-8 border-t border-border">
                  <span className="text-sm font-sans tracking-wide">{featuredPost.author}</span>
                  <span className="text-sm text-muted-foreground">{featuredPost.date}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Grid Posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {gridPosts.map((post, i) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer flex flex-col"
            >
              <BorderRotate
                animationMode="rotate-on-hover"
                animationSpeed={4}
                backgroundColor="hsl(var(--card))"
                borderRadius={12}
                borderWidth={2}
                className="p-2 h-full flex flex-col"
              >
              <div className="aspect-[4/3] overflow-hidden mb-4 rounded-md bg-muted">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col flex-1 px-2 pb-2">
              <span className="text-primary font-semibold tracking-widest uppercase text-xs mb-3 block">
                {post.category}
              </span>
              <h3 className="font-serif text-2xl mb-3 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="text-muted-foreground font-serif leading-relaxed mb-6 flex-1">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                <span className="text-xs uppercase tracking-wider">{post.author}</span>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              </div>
              </BorderRotate>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
