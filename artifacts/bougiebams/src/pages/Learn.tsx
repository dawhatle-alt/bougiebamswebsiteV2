import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { images } from "@/data/images";
import { Play } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Lesson {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  category: string;
  sortOrder: number;
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const v = u.pathname.split("/").filter(Boolean).pop();
      if (v) return `https://player.vimeo.com/video/${v}`;
    }
  } catch {}
  return null;
}

function getThumbnailUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1);
      if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`;
    }
  } catch {}
  return null;
}

function VideoCard({ lesson }: { lesson: Lesson }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getEmbedUrl(lesson.videoUrl);
  const thumbnail = getThumbnailUrl(lesson.videoUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-card border border-border overflow-hidden"
    >
      <div className="aspect-video relative bg-muted">
        {playing && embedUrl ? (
          <iframe
            src={`${embedUrl}?autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            className="w-full h-full flex items-center justify-center relative"
            onClick={() => setPlaying(true)}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={lesson.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-secondary" />
            )}
            <div className="relative z-10 w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </button>
        )}
      </div>
      <div className="p-5">
        <span className="text-xs text-primary font-semibold uppercase tracking-widest">
          {lesson.category}
        </span>
        <h3 className="font-serif text-xl mt-1 mb-2">{lesson.title}</h3>
        {lesson.description && (
          <p className="text-sm text-muted-foreground font-serif leading-relaxed">
            {lesson.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function Learn() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/lessons`)
      .then((r) => (r.ok ? r.json() : { lessons: [] }))
      .then((data) => setLessons(data.lessons ?? []))
      .catch(() => {})
      .finally(() => setLoadingLessons(false));
  }, []);

  const categories = [...new Set(lessons.map((l) => l.category))];

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8">

        {/* Video Lessons Section */}
        {(loadingLessons || lessons.length > 0) && (
          <section className="mb-32">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-primary font-semibold tracking-widest uppercase text-xs mb-4 block">
                Video Lessons
              </span>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">
                Learn from BougieBams
              </h1>
              <p className="text-xl text-muted-foreground font-serif leading-relaxed">
                Step-by-step video lessons created just for you — from tiles to tactics.
              </p>
            </div>

            {loadingLessons ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-video bg-muted animate-pulse rounded-sm" />
                ))}
              </div>
            ) : (
              <div className="space-y-12">
                {categories.map((cat) => (
                  <div key={cat}>
                    <h2 className="font-serif text-2xl mb-6 flex items-center gap-3">
                      <span className="text-primary italic">{cat}</span>
                      <span className="flex-1 border-t border-border" />
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {lessons
                        .filter((l) => l.category === cat)
                        .map((lesson) => (
                          <VideoCard key={lesson.id} lesson={lesson} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Static Beginner's Guide */}
        {!loadingLessons && (
          <>
            <div className="text-center max-w-3xl mx-auto mb-20">
              <span className="text-primary font-semibold tracking-widest uppercase text-xs mb-4 block">
                Beginner's Guide
              </span>
              <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">
                {lessons.length > 0 ? "The Basics" : "Master the Art of Mahjong"}
              </h2>
              <p className="text-xl text-muted-foreground font-serif leading-relaxed">
                Intimidated by the tiles? Don't be. Welcome to the BougieBams guide to playing
                American Mahjong with confidence and style.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-32">
              <section>
                <h2 className="font-serif text-4xl mb-8 flex items-center">
                  <span className="text-primary italic mr-4">01.</span> The Tiles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="aspect-square bg-muted p-8 flex items-center justify-center">
                    <img
                      src={images.mahjongTilesCloseup}
                      alt="Tiles"
                      className="w-full h-full object-cover shadow-xl"
                    />
                  </div>
                  <div className="font-serif text-lg leading-relaxed text-muted-foreground space-y-4">
                    <p>
                      A standard American Mahjong set consists of 152 tiles. These are broken
                      down into several categories:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-foreground">
                      <li>
                        <strong className="font-semibold text-primary">Suits:</strong> Bams
                        (bamboos), Craks (characters), and Dots. Numbered 1–9.
                      </li>
                      <li>
                        <strong className="font-semibold text-primary">Winds:</strong> North,
                        South, East, and West.
                      </li>
                      <li>
                        <strong className="font-semibold text-primary">Dragons:</strong> Red,
                        Green, and White (often represented by a blank tile or a frame).
                      </li>
                      <li>
                        <strong className="font-semibold text-primary">Flowers:</strong>{" "}
                        Beautiful illustrative tiles.
                      </li>
                      <li>
                        <strong className="font-semibold text-primary">Jokers:</strong> The
                        wildcards of the game.
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-4xl mb-8 flex items-center">
                  <span className="text-primary italic mr-4">02.</span> The Objective
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
                  <div className="font-serif text-lg leading-relaxed text-muted-foreground space-y-4 order-2 md:order-1">
                    <p>
                      The goal is simple: be the first player to match your 14 tiles to a
                      specific pattern listed on the National Mah Jongg League card.
                    </p>
                    <p>
                      Think of it like a very complex, very chic version of Rummy. You draw a
                      tile, you discard a tile, and you slowly build your hand until you can
                      declare "Mahjong!"
                    </p>
                    <p>The card changes every year, keeping the game fresh and players on their toes.</p>
                  </div>
                  <div className="aspect-square bg-card border border-border p-12 flex flex-col items-center justify-center text-center order-1 md:order-2">
                    <h3 className="font-serif text-3xl mb-4">Mahjong!</h3>
                    <p className="text-muted-foreground font-serif">
                      The sweetest word you can say at the table.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-4xl mb-8 flex items-center">
                  <span className="text-primary italic mr-4">03.</span> The Charleston
                </h2>
                <div className="bg-secondary text-secondary-foreground p-8 md:p-16 rounded-sm">
                  <h3 className="font-serif text-2xl mb-6 text-white">The Pre-Game Dance</h3>
                  <div className="font-serif text-lg leading-relaxed text-white/80 space-y-4 max-w-2xl">
                    <p>
                      Before the drawing and discarding begins, there is The Charleston. This is
                      a mandatory passing phase where players exchange three tiles at a time with
                      the players next to and across from them.
                    </p>
                    <p>
                      It's your chance to dump the tiles that don't fit your desired hand, and
                      hopefully pick up ones that do. It requires strategy, a poker face, and
                      knowing which tiles to hold onto.
                    </p>
                  </div>
                </div>
              </section>

              <div className="text-center pt-16 border-t border-border">
                <h2 className="font-serif text-3xl mb-6">Ready to play?</h2>
                <p className="text-muted-foreground font-serif text-lg mb-8 max-w-xl mx-auto">
                  Grab a beautiful set, call three friends, and pour something delicious.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-10 text-lg bg-foreground text-background hover:bg-primary rounded-none"
                >
                  <Link href="/shop">Shop Starter Sets</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
