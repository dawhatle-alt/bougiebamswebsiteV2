import { motion } from "framer-motion";

export default function Founder() {
  return (
    <div className="w-full bg-background">
      {/* Page header */}
      <div className="py-16 text-center" style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #0f2318 100%)" }}>
        <p className="text-xs tracking-[4px] uppercase text-primary mb-3 font-medium">Bougie Bams</p>
        <h1 className="font-serif text-4xl md:text-5xl text-white font-medium">Meet the Founder</h1>
      </div>
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="py-20 md:py-32 bg-background"
      >
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-xs tracking-[4px] uppercase text-primary mb-3 font-medium sr-only">Meet the Founder</p>
          <div className="grid md:grid-cols-[1fr_1.6fr] gap-14 items-start">
            <div className="relative flex flex-col gap-3">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={`${import.meta.env.BASE_URL}patsy-atx-tournament.jpg`}
                  alt="Patsy Miller — Founder & CEO of Bougie Bams"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-square rounded-xl overflow-hidden shadow-md">
                  <img
                    src={`${import.meta.env.BASE_URL}patsy-mahj-bash.jpg`}
                    alt="Patsy at a Bougie Bams Mahj Bash"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="aspect-square rounded-xl overflow-hidden shadow-md">
                  <img
                    src={`${import.meta.env.BASE_URL}patsy-earthly-hand.jpg`}
                    alt="Patsy showing off a mahjong hand"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-primary text-background text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-xl shadow-md">
                Founder &amp; CEO
              </div>
            </div>

            <div className="flex flex-col gap-5 pt-2 md:pt-0">
              <div>
                <h2 className="font-serif text-4xl md:text-5xl font-medium mb-1 text-foreground">Patsy Miller</h2>
                <p className="text-primary text-sm tracking-wide">Founder &amp; CEO, Bougie Bams</p>
              </div>
              <div className="space-y-4 text-muted-foreground font-light leading-relaxed text-[15px]">
                <p>
                  If you know me, you know I love bringing people together. Whether it's hosting a dinner party, planning an event, or simply gathering friends around a table, I've always been happiest when there's food, laughter, conversation, and maybe just a touch of over-the-top flair. Most people who know me would tell you that "bougie" has always been one of my defining characteristics — and I happily embrace it.
                </p>
                <p>
                  I'm a proud 12th-generation Texan and the second of six children. Family and community have always been at the center of my life, and there's never a shortage of reasons to gather and celebrate.
                </p>
                <p>
                  I'm also known for my eyeglasses. Bright colors are kind of my thing — I own more than twenty pairs, and each one is a little reflection of my personality: bold, fun, and unapologetically colorful. So when I discovered mahjong, it felt like fate. I was immediately drawn to the beautiful tables, vibrant tiles, and endless pops of color. But what I fell in love with most was the social side of the game. Mahjong has a way of turning strangers into friends and ordinary afternoons into memories.
                </p>
                <p>
                  The name is actually pretty simple. "Bougie" is what friends and family have called me for years. And "Bams"? Mahjong players know that's a nod to bamboo tiles — a little wink to the game that brought all of this together.
                </p>
              </div>
              <blockquote className="border-l-4 border-primary pl-5 py-1 bg-primary/5 pr-4 rounded-r-md">
                <p className="italic text-foreground/80 font-light text-base leading-relaxed">
                  "My hope is that every Bougie Bams gathering becomes more than just a game. I hope it becomes a place where friendships are formed, traditions are created, and people leave feeling a little happier than when they arrived."
                </p>
              </blockquote>
              <p className="text-muted-foreground font-light text-sm italic">
                Because life is simply better when there's color, community, and a seat for everyone at the table. I'm so glad you're here.
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
