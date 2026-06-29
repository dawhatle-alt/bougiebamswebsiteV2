import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { images } from "@/data/images";

export default function About() {
  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <section className="container mx-auto px-4 md:px-8 mb-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">Our Story</h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-serif leading-relaxed">
            BougieBams was born from a love of the game and a frustration with uninspiring design.
          </p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="aspect-[21/9] bg-muted w-full overflow-hidden"
        >
          <img 
            src={images.mahjongLifestyle} 
            alt="Women playing Mahjong"
            className="w-full h-full object-cover"
          />
        </motion.div>
      </section>

      <section className="container mx-auto px-4 md:px-8 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-serif text-4xl mb-6">The Mahjong Renaissance</h2>
            <div className="space-y-6 text-lg font-serif text-muted-foreground leading-relaxed">
              <p>
                We started playing Mahjong as an excuse to get together. It was a weekly ritual—wine, snacks, catching up, and the rhythmic clatter of the tiles. But as our obsession with the game grew, our dissatisfaction with the equipment grew alongside it.
              </p>
              <p>
                The sets on the market felt outdated. They didn't match the aesthetics of our homes, our wardrobes, or our lives. We wanted a set that we were proud to leave out on the coffee table. A set that felt like a luxury accessory.
              </p>
              <p>
                So we created BougieBams. A brand dedicated to elevating the Mahjong experience. We believe that beautiful design enhances beautiful moments, and there is no better moment than sitting around a table with people you love.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[3/4] bg-muted mt-12">
              <img src={images.heroTile1} alt="Tiles" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-[3/4] bg-muted">
              <img src={images.productJade} alt="Tiles" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card py-24 border-y border-border mb-32">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold tracking-widest uppercase text-xs mb-4 block">Our Philosophy</span>
            <h2 className="font-serif text-4xl md:text-5xl">What Drives Us</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {[
              {
                title: "Uncompromising Quality",
                desc: "We sweat the small stuff. The exact weight of a tile, the vibrancy of the paint, the smooth finish of an acrylic rack. Luxury is in the details."
              },
              {
                title: "Intentional Aesthetics",
                desc: "We design for the modern home. Our color palettes are sophisticated, our typography is refined, and our styling is unapologetically chic."
              },
              {
                title: "Connection First",
                desc: "Beautiful tiles are just the vehicle. The real magic of BougieBams is bringing people together around a table for hours of unplugged connection."
              }
            ].map((value, i) => (
              <div key={i} className="bg-background p-8 border border-border">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-serif text-2xl mb-4">{value.title}</h3>
                <p className="text-muted-foreground font-serif leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-8 pb-24">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl">The Team</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { name: "Chloe Winters", role: "Co-Founder & Creative Director", img: "https://i.pravatar.cc/300?u=a" },
            { name: "Samantha Hayes", role: "Co-Founder & Operations", img: "https://i.pravatar.cc/300?u=b" },
            { name: "Jessica Lin", role: "Head of Product Design", img: "https://i.pravatar.cc/300?u=c" },
          ].map((member, i) => (
            <div key={i} className="text-center">
              <div className="aspect-square rounded-full overflow-hidden mb-6 max-w-[200px] mx-auto border-4 border-muted">
                <img src={member.img} alt={member.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
              </div>
              <h3 className="font-serif text-2xl mb-1">{member.name}</h3>
              <p className="text-sm font-sans tracking-widest uppercase text-primary">{member.role}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
