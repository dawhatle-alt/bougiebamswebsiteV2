import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { images } from "@/data/images";
import { Play } from "lucide-react";
import { heroContainer, heroItem, scrollContainer, fadeUp, dividerLine, VP } from "@/lib/motion";

const NAVY = "#1E2A5A";
const GOLD = "#D4AF37";
const CREAM = "#FAF7F0";
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

function VideoCard({ lesson, index }: { lesson: Lesson; index: number }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getEmbedUrl(lesson.videoUrl);
  const thumbnail = getThumbnailUrl(lesson.videoUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      className="group rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-white"
      style={{ borderColor: "#E2DBCD" }}
    >
      <div className="aspect-video relative" style={{ backgroundColor: NAVY }}>
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
            aria-label={`Play ${lesson.title}`}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={lesson.title}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${NAVY} 0%, #2d3f7a 100%)`,
                }}
              />
            )}
            {/* Play button */}
            <div
              className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-200"
              style={{ backgroundColor: GOLD }}
            >
              <Play className="w-5 h-5 ml-0.5" fill={NAVY} color={NAVY} />
            </div>
          </button>
        )}
      </div>
      <div className="p-5" style={{ backgroundColor: CREAM }}>
        <p
          className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5"
          style={{ color: GOLD }}
        >
          {lesson.category}
        </p>
        <h3
          className="font-medium text-lg mb-2 leading-snug"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
        >
          {lesson.title}
        </h3>
        {lesson.description && (
          <p className="text-sm leading-relaxed" style={{ color: "#5A6178" }}>
            {lesson.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function SectionRule({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <h2
        className="text-2xl md:text-3xl font-medium shrink-0"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
      >
        <em style={{ color: GOLD }}>{title}</em>
      </h2>
      <motion.div
        variants={dividerLine}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="flex-1 h-px"
        style={{ backgroundColor: `${GOLD}50` }}
      />
    </div>
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
    <div className="w-full">

      {/* ── Hero ─────────────────────────────────── */}
      <section
        className="relative py-24 md:py-36 px-6 overflow-hidden"
        style={{ minHeight: "420px" }}
      >
        <img
          src={`${import.meta.env.BASE_URL}bougie-zebra-banner.png`}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-[70%_center]"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(150deg, rgba(30,42,90,0.88) 0%, rgba(30,42,90,0.72) 60%, rgba(30,42,90,0.55) 100%)`,
          }}
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div variants={heroContainer} initial="hidden" animate="show">
            <motion.p
              variants={heroItem}
              className="text-xs font-bold tracking-[0.25em] uppercase mb-5"
              style={{ color: GOLD }}
            >
              Learn to Play
            </motion.p>
            <motion.h1
              variants={heroItem}
              className="font-medium leading-[1.05] text-white mb-6"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(3rem, 7vw, 5.5rem)",
              }}
            >
              Master the art<br />
              <em style={{ color: GOLD }}>of mahjong.</em>
            </motion.h1>
            <motion.p
              variants={heroItem}
              className="text-lg font-light max-w-xl leading-relaxed"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Intimidated by the tiles? Don't be. From beginner basics to advanced
              strategy, we've got you covered — with video lessons and a full guide
              written just for you.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Video lessons ─────────────────────────── */}
      {(loadingLessons || lessons.length > 0) && (
        <section className="py-16 md:py-24 px-6" style={{ backgroundColor: CREAM }}>
          <div className="max-w-5xl mx-auto">
            <div className="mb-12">
              <p
                className="text-xs font-bold tracking-[0.25em] uppercase mb-3"
                style={{ color: GOLD }}
              >
                Video Lessons
              </p>
              <h2
                className="font-medium leading-tight"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  color: NAVY,
                }}
              >
                Learn from BougieBams
              </h2>
              <p className="mt-2 text-base font-light" style={{ color: "#5A6178" }}>
                Step-by-step video lessons — from tiles to tactics.
              </p>
            </div>

            {loadingLessons ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-[#E2DBCD] animate-pulse">
                    <div className="aspect-video bg-[#D0C8B8]" />
                    <div className="p-5 bg-white space-y-2">
                      <div className="h-3 bg-[#E2DBCD] rounded w-1/4" />
                      <div className="h-5 bg-[#E2DBCD] rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-14">
                {categories.map((cat) => (
                  <div key={cat}>
                    <SectionRule title={cat} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {lessons
                        .filter((l) => l.category === cat)
                        .map((lesson, i) => (
                          <VideoCard key={lesson.id} lesson={lesson} index={i} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Beginner's guide ──────────────────────── */}
      {!loadingLessons && (
        <section
          className="py-16 md:py-24 px-6"
          style={{ backgroundColor: lessons.length > 0 ? "#fff" : CREAM }}
        >
          <div className="max-w-5xl mx-auto">
            {/* Section intro */}
            <div className="mb-16 max-w-2xl">
              <p
                className="text-xs font-bold tracking-[0.25em] uppercase mb-3"
                style={{ color: GOLD }}
              >
                Beginner's Guide
              </p>
              <h2
                className="font-medium leading-tight mb-4"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  color: NAVY,
                }}
              >
                {lessons.length > 0 ? "The Basics" : "Master the Art of Mahjong"}
              </h2>
              <p className="text-base font-light leading-relaxed" style={{ color: "#5A6178" }}>
                Intimidated by the tiles? Don't be. Welcome to the BougieBams guide to
                playing American Mahjong with confidence and style.
              </p>
            </div>

            <div className="space-y-24">

              {/* The Tiles */}
              <div>
                <SectionRule title="The Tiles" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                  <div
                    className="aspect-square rounded-2xl overflow-hidden shadow-md"
                    style={{ backgroundColor: CREAM }}
                  >
                    <img
                      src={images.mahjongTilesCloseup}
                      alt="Mahjong tiles close-up"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-4 text-[15px] font-light leading-relaxed" style={{ color: "#3D4562" }}>
                    <p>
                      A standard American Mahjong set consists of 152 tiles, broken down
                      into several categories:
                    </p>
                    <ul className="space-y-3">
                      {[
                        { term: "Suits", desc: "Bams (bamboos), Craks (characters), and Dots. Numbered 1–9." },
                        { term: "Winds", desc: "North, South, East, and West." },
                        { term: "Dragons", desc: "Red, Green, and White (often represented by a blank tile or a frame)." },
                        { term: "Flowers", desc: "Beautiful illustrative tiles." },
                        { term: "Jokers", desc: "The wildcards of the game." },
                      ].map(({ term, desc }) => (
                        <li key={term} className="flex gap-3">
                          <span
                            className="shrink-0 font-bold text-sm pt-0.5"
                            style={{ color: GOLD }}
                          >
                            {term}
                          </span>
                          <span>{desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* The Objective */}
              <div>
                <SectionRule title="The Objective" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                  <div className="space-y-4 text-[15px] font-light leading-relaxed order-2 md:order-1" style={{ color: "#3D4562" }}>
                    <p>
                      The goal is simple: be the first player to match your 14 tiles to a
                      specific pattern listed on the National Mah Jongg League card.
                    </p>
                    <p>
                      Think of it like a very complex, very chic version of Rummy. You
                      draw a tile, you discard a tile, and you slowly build your hand until
                      you can declare{" "}
                      <strong className="font-semibold" style={{ color: NAVY }}>
                        "Mahjong!"
                      </strong>
                    </p>
                    <p>
                      The card changes every year, keeping the game fresh and every player
                      on their toes.
                    </p>
                  </div>

                  <div
                    className="flex flex-col items-center justify-center text-center p-12 rounded-2xl border order-1 md:order-2"
                    style={{ backgroundColor: CREAM, borderColor: "#E2DBCD" }}
                  >
                    <p
                      className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3"
                      style={{ color: GOLD }}
                    >
                      The sweetest word at the table
                    </p>
                    <p
                      className="font-medium"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "clamp(3rem, 8vw, 5rem)",
                        color: NAVY,
                        lineHeight: 1,
                      }}
                    >
                      Mahjong!
                    </p>
                  </div>
                </div>
              </div>

              {/* The Charleston */}
              <div>
                <SectionRule title="The Charleston" />
                <div
                  className="rounded-2xl px-8 py-12 md:px-16 md:py-16 relative overflow-hidden"
                  style={{ backgroundColor: NAVY }}
                >
                  {/* Dot texture */}
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, ${GOLD} 1px, transparent 0)`,
                      backgroundSize: "32px 32px",
                    }}
                  />
                  <div className="relative z-10 max-w-2xl">
                    <p
                      className="text-xs font-bold tracking-[0.25em] uppercase mb-4"
                      style={{ color: GOLD }}
                    >
                      The Pre-Game Dance
                    </p>
                    <h3
                      className="font-medium text-white mb-6"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                      }}
                    >
                      Before the game begins, there's strategy.
                    </h3>
                    <div
                      className="space-y-4 text-[15px] font-light leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      <p>
                        Before the drawing and discarding begins, there is The Charleston.
                        This is a mandatory passing phase where players exchange three tiles
                        at a time with the players next to and across from them.
                      </p>
                      <p>
                        It's your chance to dump the tiles that don't fit your desired hand,
                        and hopefully pick up ones that do. It requires strategy, a poker
                        face, and knowing which tiles to hold onto.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* CTA */}
            <div
              className="mt-24 pt-12 border-t text-center"
              style={{ borderColor: "#E2DBCD" }}
            >
              <p
                className="text-xs font-bold tracking-[0.25em] uppercase mb-4"
                style={{ color: GOLD }}
              >
                Ready to play?
              </p>
              <h2
                className="font-medium mb-3"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  color: NAVY,
                }}
              >
                Grab a beautiful set,<br />call three friends.
              </h2>
              <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "#5A6178" }}>
                Grab a beautiful set, pour something delicious, and let the tiles do the rest.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/shop">
                  <button
                    className="px-8 py-3 rounded-full text-sm font-bold tracking-wide transition-opacity hover:opacity-85"
                    style={{ backgroundColor: NAVY, color: "#fff" }}
                  >
                    Shop Starter Sets
                  </button>
                </Link>
                <Link href="/events">
                  <button
                    className="px-8 py-3 rounded-full text-sm font-semibold border transition-colors hover:border-[#1E2A5A]"
                    style={{ borderColor: "#D0C8B8", color: NAVY }}
                  >
                    Find an Event
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
