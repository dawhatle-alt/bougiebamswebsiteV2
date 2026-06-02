import { Link } from "wouter";
import { motion } from "framer-motion";
import { HeroShuffleGrid } from "@/components/HeroShuffleGrid";
import { Button } from "@/components/ui/button";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { TextEffect } from "@/components/ui/text-effect";
import { useProducts } from "@/hooks/useProducts";
import { images } from "@/data/images";
import { useCart } from "@/context/CartContext";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronRight, ArrowRight, Quote, Star, ShoppingBag } from "lucide-react";

export default function Home() {
  const [emblaRef] = useEmblaCarousel({ loop: true });
  const { addItem } = useCart();
  const { products } = useProducts();

  const bestsellers = products.filter(p => p.isBestseller).slice(0, 4);

  const testimonials = [
    {
      name: "Eleanor S.",
      quote: "I've been playing for 20 years and this is by far the most beautiful set I've ever owned. The weight of the tiles is perfect.",
      avatar: "https://i.pravatar.cc/150?u=1"
    },
    {
      name: "Margaret P.",
      quote: "BougieBams completely transformed our weekly game night. It feels less like a game and more like an event now.",
      avatar: "https://i.pravatar.cc/150?u=2"
    },
    {
      name: "Victoria C.",
      quote: "The Rose Gold set was a gift for my 40th birthday. It's stunning. The craftsmanship is undeniable.",
      avatar: "https://i.pravatar.cc/150?u=3"
    },
    {
      name: "Jacqueline H.",
      quote: "Finally, a mahjong brand that understands aesthetics. It looks gorgeous sitting on my coffee table even when we're not playing.",
      avatar: "https://i.pravatar.cc/150?u=4"
    }
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <HeroShuffleGrid />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-8 mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-flex items-center justify-center gap-4 mb-5 text-primary font-bold tracking-[0.25em] uppercase text-sm md:text-base [text-shadow:0_1px_8px_hsl(var(--background))]">
              <span className="h-px w-8 md:w-12 bg-primary/70"></span>
              The Art of the Game
              <span className="h-px w-8 md:w-12 bg-primary/70"></span>
            </span>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.1] text-foreground">
              <TextEffect as="span" per="word" preset="blur" className="block">
                Where Style Meets
              </TextEffect>
              <TextEffect as="span" per="word" preset="blur" delay={0.5} className="block italic font-light">
                the Table.
              </TextEffect>
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <p className="text-xl md:text-2xl text-foreground font-serif max-w-2xl mx-auto mb-10 [text-shadow:0_1px_10px_hsl(var(--background)),0_0_24px_hsl(var(--background))]">
              Premium Mahjong collections for the modern player. Curated, confident, and unapologetically stylish.
            </p>
            <Button size="lg" className="h-14 px-8 text-lg bg-foreground text-background hover:bg-primary transition-all duration-300 rounded-none group" asChild>
              <Link href="/shop">
                Shop the Collection 
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl mb-4">Curated Collections</h2>
              <p className="text-muted-foreground text-lg max-w-xl font-serif">
                Discover sets designed to complement your space and elevate your play.
              </p>
            </div>
            <Link href="/shop" className="inline-flex items-center text-primary font-medium tracking-wide uppercase text-sm hover:opacity-80 transition-opacity">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "The Jade Collection", img: images.productJade, path: "/shop?category=Complete+Sets" },
              { title: "The Rose Gold Set", img: images.productRosegold, path: "/shop?category=Complete+Sets" },
              { title: "Accessories & Extras", img: images.heroTile3, path: "/shop?category=Tiles+%26+Accessories" }
            ].map((collection, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative aspect-[3/4]"
              >
                <BorderRotate
                  animationMode="rotate-on-hover"
                  animationSpeed={4}
                  backgroundColor="hsl(var(--card))"
                  borderRadius={12}
                  borderWidth={2}
                  className="h-full w-full overflow-hidden cursor-pointer"
                >
                <Link href={collection.path} className="block relative h-full w-full overflow-hidden rounded-[10px]">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500 z-10" />
                  <img 
                    src={collection.img} 
                    alt={collection.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                    <h3 className="text-white font-serif text-3xl mb-2">{collection.title}</h3>
                    <div className="flex items-center text-white/90 text-sm tracking-wider uppercase font-medium">
                      <span className="relative overflow-hidden">
                        <span className="block transition-transform duration-300 group-hover:-translate-y-full">Explore</span>
                        <span className="block absolute inset-0 transition-transform duration-300 translate-y-full group-hover:translate-y-0 text-primary">Explore</span>
                      </span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </div>
                </Link>
                </BorderRotate>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Differentiators */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold tracking-widest uppercase text-xs mb-4 block">Our Standard</span>
            <h2 className="font-serif text-4xl md:text-5xl">Why BougieBams?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {[
              {
                title: "Premium Materials",
                desc: "We source only the highest grade acrylics and metals, ensuring each tile has the perfect weight, sound, and hand-feel."
              },
              {
                title: "Artisan Craftsmanship",
                desc: "Every set is hand-finished with meticulous attention to detail, from the crispness of the engraving to the flawless polishing."
              },
              {
                title: "Modern Aesthetic",
                desc: "We honor the tradition of the game while reimagining the aesthetic for the modern, design-conscious player."
              }
            ].map((feature, i) => (
              <div key={i} className="text-center space-y-4">
                <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
                  <span className="font-serif text-2xl italic">{i + 1}</span>
                </div>
                <h3 className="font-serif text-2xl">{feature.title}</h3>
                <p className="text-muted-foreground font-serif text-lg leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-primary font-semibold tracking-[0.2em] uppercase text-xs mb-3 block">Most Loved</span>
              <h2 className="font-serif text-4xl md:text-5xl mb-4">Best Sellers</h2>
              <p className="text-muted-foreground text-lg max-w-xl font-serif">
                The sets and accessories our community returns to, time and again.
              </p>
            </div>
            <Link href="/shop" className="inline-flex items-center text-primary font-medium tracking-wide uppercase text-sm hover:opacity-80 transition-opacity">
              Shop All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {bestsellers.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group"
              >
                <BorderRotate
                  animationMode="rotate-on-hover"
                  animationSpeed={4}
                  backgroundColor="hsl(var(--card))"
                  borderRadius={12}
                  borderWidth={2}
                  className="p-2 h-full"
                >
                <Link href={`/shop/${product.id}`} className="block">
                  <div className="relative aspect-square bg-muted mb-3 overflow-hidden rounded-md">
                    {product.isBestseller && (
                      <div className="absolute top-4 left-4 z-10 bg-background text-foreground text-xs font-semibold tracking-widest uppercase px-3 py-1 shadow-sm">
                        Best Seller
                      </div>
                    )}
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="px-2 pb-2">
                    <h3 className="font-serif text-xl mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center text-primary">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className={`w-3 h-3 ${j < Math.floor(product.rating) ? 'fill-current' : ''}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium">${product.price}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); addItem(product, 1); }}
                        className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4" /> Add
                      </button>
                    </div>
                  </div>
                </Link>
                </BorderRotate>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-background overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl">Word on the Table</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
              <div className="flex">
                {testimonials.map((testimonial, i) => (
                  <div key={i} className="flex-[0_0_100%] min-w-0 pl-4 md:pl-8 first:pl-0">
                    <div className="flex flex-col items-center text-center px-4 md:px-12">
                      <Quote className="w-10 h-10 text-primary/30 mb-8" />
                      <p className="font-serif text-2xl md:text-3xl leading-relaxed text-foreground mb-10">
                        "{testimonial.quote}"
                      </p>
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name}
                        className="w-16 h-16 rounded-full object-cover mb-4 ring-2 ring-primary/20 p-1"
                      />
                      <span className="font-sans font-medium tracking-widest uppercase text-xs text-muted-foreground">
                        {testimonial.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-secondary text-secondary-foreground py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-accent rounded-full blur-3xl opacity-10"></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center max-w-2xl">
          <span className="text-primary font-semibold tracking-widest uppercase text-xs mb-4 block">The Inner Circle</span>
          <h2 className="font-serif text-4xl md:text-5xl mb-6 text-white">Join the Club</h2>
          <p className="font-serif text-lg md:text-xl text-secondary-foreground/70 mb-10">
            Sign up for exclusive access to new collections, limited edition drops, and expert playing strategies.
          </p>
          
          <form className="flex flex-col sm:flex-row gap-4" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Email address"
              className="flex-1 h-14 bg-white/5 border border-white/10 px-6 font-sans text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors rounded-sm"
              required
            />
            <Button type="submit" className="h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-widest uppercase text-sm rounded-sm">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
