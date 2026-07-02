import { motion } from "framer-motion";
import { Link } from "wouter";

const NAVY = "#1E2A5A";
const GOLD = "#D4AF37";
const CREAM = "#FAF7F0";

export default function Founder() {
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-xs font-bold tracking-[0.25em] uppercase mb-5"
              style={{ color: GOLD }}
            >
              Bougie Bams
            </p>
            <h1
              className="font-medium leading-none text-white mb-4"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(3rem, 7vw, 5.5rem)",
              }}
            >
              Meet the Founder
            </h1>
            <p
              className="text-lg font-light max-w-xl"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              The colorful, over-the-top Texan behind your favorite mahjong community.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Main content ─────────────────────────── */}
      <section className="py-20 md:py-28 px-6" style={{ backgroundColor: CREAM }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="grid md:grid-cols-[1fr_1.7fr] gap-14 md:gap-20 items-start"
          >
            {/* ── Photo mosaic ── */}
            <div className="relative">
              {/* Main portrait with gold accent */}
              <div className="relative">
                <div
                  className="absolute -top-2 -left-2 w-full h-full rounded-2xl"
                  style={{ border: `2px solid ${GOLD}`, opacity: 0.6 }}
                />
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={`${import.meta.env.BASE_URL}patsy-atx-tournament.jpg`}
                    alt="Patsy Miller — Founder & CEO of Bougie Bams"
                    className="w-full h-full object-cover object-top"
                  />
                  {/* Gold overlay strip at bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 px-4 py-3"
                    style={{
                      background: `linear-gradient(to top, ${NAVY}cc, transparent)`,
                    }}
                  >
                    <span
                      className="text-[10px] font-bold tracking-[0.2em] uppercase"
                      style={{ color: GOLD }}
                    >
                      Founder &amp; CEO
                    </span>
                  </div>
                </div>
              </div>

              {/* Two smaller photos */}
              <div className="grid grid-cols-2 gap-3 mt-3">
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
                    alt="Patsy at the mahjong table"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>

            {/* ── Biography ── */}
            <div className="flex flex-col gap-6 pt-2">
              <div>
                <h2
                  className="font-medium leading-none mb-2"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2.5rem, 5vw, 4rem)",
                    color: NAVY,
                  }}
                >
                  Patsy Miller
                </h2>
                <p
                  className="text-sm font-semibold tracking-wide"
                  style={{ color: GOLD }}
                >
                  Founder &amp; CEO, Bougie Bams
                </p>

                {/* Thin gold rule */}
                <div className="mt-4 h-px w-16" style={{ backgroundColor: GOLD }} />
              </div>

              <div
                className="space-y-4 text-[15px] font-light leading-relaxed"
                style={{ color: "#3D4562" }}
              >
                <p>
                  If you know me, you know I love bringing people together. Whether it's
                  hosting a dinner party, planning an event, or simply gathering friends
                  around a table, I've always been happiest when there's food, laughter,
                  conversation, and maybe just a touch of over-the-top flair. Most people
                  who know me would tell you that "bougie" has always been one of my
                  defining characteristics — and I happily embrace it.
                </p>
                <p>
                  I'm a proud 12th-generation Texan and the second of six children.
                  Family and community have always been at the center of my life, and
                  there's never a shortage of reasons to gather and celebrate.
                </p>
                <p>
                  I'm also known for my eyeglasses. Bright colors are kind of my thing —
                  I own more than twenty pairs, and each one is a little reflection of my
                  personality: bold, fun, and unapologetically colorful. So when I
                  discovered mahjong, it felt like fate. I was immediately drawn to the
                  beautiful tables, vibrant tiles, and endless pops of color. But what I
                  fell in love with most was the social side of the game. Mahjong has a
                  way of turning strangers into friends and ordinary afternoons into
                  memories.
                </p>
                <p>
                  The name is actually pretty simple. "Bougie" is what friends and family
                  have called me for years. And "Bams"? Mahjong players know that's a nod
                  to bamboo tiles — a little wink to the game that brought all of this
                  together.
                </p>
              </div>

              {/* Pull quote */}
              <blockquote
                className="border-l-2 pl-5 py-1 my-2"
                style={{ borderColor: GOLD }}
              >
                <p
                  className="italic text-base leading-relaxed"
                  style={{ color: NAVY }}
                >
                  "My hope is that every Bougie Bams gathering becomes more than just a
                  game. I hope it becomes a place where friendships are formed, traditions
                  are created, and people leave feeling a little happier than when they
                  arrived."
                </p>
              </blockquote>

              <p
                className="text-sm italic font-light"
                style={{ color: "#5A6178" }}
              >
                Because life is simply better when there's color, community, and a seat
                for everyone at the table. I'm so glad you're here.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/events">
                  <button
                    className="px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ backgroundColor: NAVY, color: "#fff" }}
                  >
                    Join an Event
                  </button>
                </Link>
                <Link href="/about">
                  <button
                    className="px-6 py-2.5 rounded-full text-sm font-semibold border transition-colors hover:border-[#1E2A5A]"
                    style={{ borderColor: "#D0C8B8", color: NAVY }}
                  >
                    Our Story
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────── */}
      <section
        className="py-20 px-6 text-center"
        style={{ backgroundColor: NAVY }}
      >
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs font-bold tracking-[0.25em] uppercase mb-4"
            style={{ color: GOLD }}
          >
            Come Play
          </p>
          <h2
            className="font-medium text-white mb-4"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
            }}
          >
            Ready to join the table?
          </h2>
          <p
            className="text-base mb-10 font-light"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Find an upcoming event and experience the Bougie Bams community for yourself.
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
