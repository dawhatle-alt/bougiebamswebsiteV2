import { motion } from "framer-motion";

export default function About() {
  return (
    <div className="w-full bg-background">
      <section className="py-20 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-serif text-5xl md:text-7xl font-medium mb-8 leading-tight">
                More than a game.<br/>
                <span className="text-primary italic">An experience.</span>
              </h1>
              <div className="space-y-6 text-lg text-muted-foreground font-light leading-relaxed">
                <p>
                  Bougie Bams was born from a love of mahjong and a belief that every gathering deserves to be memorable. We wanted events where the setup was stunning, the company was warm, and the atmosphere was nothing short of luxurious.
                </p>
                <p>
                  We're done with plain folding tables and mismatched tiles. Bougie Bams curates intimate mahjong events where you can choose from over <strong className="font-medium text-foreground">40 premium mats, tile sets, and racks</strong> — so your table looks and feels exactly the way you want it.
                </p>
                <p>
                  Whether you're a seasoned player or picking up tiles for the first time, when you attend a Bougie Bams event you're stepping into a welcoming community that celebrates the game and the people who play it.
                </p>
                <blockquote className="mt-8 border-l-4 border-primary pl-5 py-1">
                  <p className="italic text-foreground font-light text-base leading-relaxed">
                    "Bougie Bams is more than a business. It's an extension of who I am — a colorful, slightly over-the-top Texan who believes life is better when people gather around a beautiful table."
                  </p>
                  <cite className="block mt-2 text-sm text-primary not-italic font-medium">— Patsy Miller, Founder &amp; CEO</cite>
                </blockquote>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[3/4] rounded-full overflow-hidden border-8 border-background shadow-2xl relative z-10">
                <video
                  src={`${import.meta.env.BASE_URL}about-oval-video.mp4`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-primary/20 blur-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
