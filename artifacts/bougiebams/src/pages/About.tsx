import { motion } from "framer-motion";
import { Link } from "wouter";

const NAVY = "#1E2A5A";
const GOLD = "#D4AF37";
const CREAM = "#FAF7F0";

const pillars = [
  { value: "40+", label: "Premium tile sets & mats" },
  { value: "All levels", label: "Beginners to seasoned players" },
  { value: "Texas born", label: "Colorful, over-the-top, and proud" },
];

export default function About() {
  return (
    <div className="w-full">

      {/* ── Hero ─────────────────────────────────── */}
      <section
        className="relative py-24 md:py-36 px-6 overflow-hidden"
        style={{ backgroundColor: NAVY }}
      >
        {/* Subtle background texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${GOLD} 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-xs font-bold tracking-[0.25em] uppercase mb-5"
              style={{ color: GOLD }}
            >
              About Bougie Bams
            </p>
            <h1
              className="font-medium leading-[1.05] text-white mb-8"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(3rem, 7vw, 5.5rem)",
              }}
            >
              More than a game.<br />
              <em style={{ color: GOLD }}>An experience.</em>
            </h1>
            <p
              className="text-lg md:text-xl max-w-2xl font-light leading-relaxed"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Bougie Bams was born from a love of mahjong and a belief that every
              gathering deserves to be memorable — stunning, warm, and nothing
              short of luxurious.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Brand pillars strip ──────────────────── */}
      <div style={{ backgroundColor: GOLD }}>
        <div className="max-w-5xl mx-auto px-6 py-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#c49b20]">
          {pillars.map(({ value, label }) => (
            <div key={value} className="flex flex-col items-center py-3 sm:py-0 sm:px-6 text-center">
              <span
                className="font-bold text-lg"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
              >
                {value}
              </span>
              <span className="text-xs font-medium mt-0.5" style={{ color: `${NAVY}cc` }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────── */}
      <section className="py-20 md:py-28 px-6" style={{ backgroundColor: CREAM }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-5 text-[15px] font-light leading-relaxed order-2 md:order-1"
              style={{ color: "#3D4562" }}
            >
              <p>
                We're done with plain folding tables and mismatched tiles. Bougie Bams curates intimate mahjong events where you can choose from over{" "}
                <strong className="font-semibold" style={{ color: NAVY }}>
                  40 premium mats, tile sets, and racks
                </strong>{" "}
                — so your table looks and feels exactly the way you want it.
              </p>
              <p>
                Whether you're a seasoned player or picking up tiles for the very
                first time, every Bougie Bams event is a welcoming community that
                celebrates the game and the people who play it.
              </p>
              <p>
                We believe the atmosphere at the table is just as important as the
                tiles in your hand. Every detail — from the linens to the lighting —
                is chosen with intention, so you feel the difference the moment you
                sit down.
              </p>

              <blockquote
                className="border-l-2 pl-5 py-1 mt-8"
                style={{ borderColor: GOLD }}
              >
                <p className="italic text-base leading-relaxed" style={{ color: NAVY }}>
                  "Bougie Bams is more than a business. It's an extension of who I am — a colorful, slightly over-the-top Texan who believes life is better when people gather around a beautiful table."
                </p>
                <footer
                  className="mt-3 text-[11px] font-bold tracking-widest uppercase"
                  style={{ color: GOLD }}
                >
                  — Patsy Miller, Founder &amp; CEO
                </footer>
              </blockquote>

              <div className="pt-4 flex flex-wrap gap-3">
                <Link href="/events">
                  <button
                    className="px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ backgroundColor: NAVY, color: "#fff" }}
                  >
                    Browse Events
                  </button>
                </Link>
                <Link href="/founder">
                  <button
                    className="px-6 py-2.5 rounded-full text-sm font-semibold border transition-colors hover:border-[#1E2A5A]"
                    style={{ borderColor: "#D0C8B8", color: NAVY }}
                  >
                    Meet Patsy
                  </button>
                </Link>
              </div>
            </motion.div>

            {/* Oval video */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="relative flex items-center justify-center order-1 md:order-2"
            >
              {/* Gold ring */}
              <div
                className="absolute inset-0 rounded-full scale-[1.04]"
                style={{
                  background: `conic-gradient(${GOLD}, #c49b20, ${GOLD})`,
                  borderRadius: "50% / 40%",
                }}
              />
              <div
                className="relative overflow-hidden shadow-2xl w-full"
                style={{ aspectRatio: "3/4", borderRadius: "50% / 40%", border: `6px solid ${CREAM}` }}
              >
                <video
                  src={`${import.meta.env.BASE_URL}about-oval-video.mp4`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Community CTA ────────────────────────── */}
      <section
        className="py-20 px-6 text-center"
        style={{ backgroundColor: NAVY }}
      >
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs font-bold tracking-[0.25em] uppercase mb-4"
            style={{ color: GOLD }}
          >
            Join Us
          </p>
          <h2
            className="font-medium text-white mb-4"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
            }}
          >
            There's always a seat<br />at our table.
          </h2>
          <p className="text-base mb-10 font-light" style={{ color: "rgba(255,255,255,0.65)" }}>
            Find an upcoming gathering near you and experience the Bougie Bams difference firsthand.
          </p>
          <Link href="/events">
            <button
              className="px-8 py-3 rounded-full text-sm font-bold tracking-wide transition-opacity hover:opacity-85"
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              See Upcoming Events
            </button>
          </Link>
        </div>
      </section>

    </div>
  );
}
