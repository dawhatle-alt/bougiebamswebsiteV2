import { useState } from "react";
import { Link } from "wouter";
import EventGallery from "@/components/EventGallery";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { formatDateShortCT } from "@/lib/dateUtils";
import {
  Calendar,
  Users,
  MapPin,
  Search,
  LayoutGrid,
  LayoutList,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useListEvents } from "@workspace/api-client-react";
import type { ApiEvent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

type ViewMode = "grid" | "list" | "calendar";

const NAVY = "#1E2A5A";
const GOLD = "#D4AF37";
const CREAM = "#FAF7F0";

function priceDisplay(event: ApiEvent): string {
  if (!event.priceCents) return "Free";
  return `$${(event.priceCents / 100).toFixed(0)}`;
}

function getImageUrl(event: ApiEvent): string | null {
  if (!event.imagePath) return null;
  const p = event.imagePath;
  if (p.startsWith("http")) return p;
  if (p.startsWith("/api/")) return p;
  if (p.startsWith("/")) return `/api/storage${p}`;
  return `${import.meta.env.BASE_URL}${p}`;
}

function DateStamp({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr);
  const day = format(d, "d");
  const mon = format(d, "MMM").toUpperCase();
  return (
    <div
      className="flex flex-col items-center justify-center w-14 h-14 rounded-xl shadow-md shrink-0"
      style={{ backgroundColor: NAVY }}
    >
      <span className="text-[10px] font-semibold tracking-widest" style={{ color: GOLD }}>
        {mon}
      </span>
      <span className="text-2xl font-bold leading-none text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        {day}
      </span>
    </div>
  );
}

function CalendarView({ events }: { events: ApiEvent[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = monthStart.getDay();
  const paddedDays: (Date | null)[] = [...Array(startDow).fill(null), ...days];

  const eventsOnDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.date), day));

  return (
    <div className="rounded-2xl border border-[#E2DBCD] shadow-sm overflow-hidden bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2DBCD]" style={{ backgroundColor: CREAM }}>
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg transition-colors hover:bg-[#E2DBCD]"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: NAVY }} />
        </button>
        <h3
          className="text-xl font-medium"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
        >
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg transition-colors hover:bg-[#E2DBCD]"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" style={{ color: NAVY }} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center border-b border-[#E2DBCD]" style={{ backgroundColor: CREAM }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2 text-xs font-semibold tracking-wider uppercase" style={{ color: NAVY, opacity: 0.5 }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {paddedDays.map((day, idx) => {
          const dayEvents = day ? eventsOnDay(day) : [];
          const isToday = day ? isSameDay(day, new Date()) : false;
          return (
            <div
              key={idx}
              className={`min-h-[80px] p-2 border-b border-r border-[#E2DBCD]/60 ${
                idx % 7 === 6 ? "border-r-0" : ""
              } ${day && !isSameMonth(day, currentMonth) ? "opacity-30" : ""}`}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full mb-1 ${
                      isToday ? "font-bold text-white" : ""
                    }`}
                    style={isToday ? { backgroundColor: NAVY } : { color: NAVY }}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <div
                          className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${GOLD}25`, color: NAVY, fontWeight: 500 }}
                        >
                          {event.title}
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GridCard({ event, index }: { event: ApiEvent; index: number }) {
  const imgUrl = getImageUrl(event);
  const price = priceDisplay(event);

  return (
    <Link href={`/events/${event.id}`}>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
        className="group cursor-pointer flex flex-col h-full rounded-2xl overflow-hidden bg-white border border-[#E2DBCD] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        style={{
          "--hover-border": GOLD,
        } as React.CSSProperties}
      >
        {/* Image area */}
        <div
          className="relative overflow-hidden"
          style={{ backgroundColor: CREAM, aspectRatio: "4/3" }}
        >
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={event.title}
              loading="lazy"
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                className="text-5xl font-medium opacity-20"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
              >
                BB
              </span>
            </div>
          )}

          {/* Gold top border on hover */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ backgroundColor: GOLD }}
          />

          {/* Price badge */}
          <div
            className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-sm font-bold shadow-md"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            {price}
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start gap-4">
            <DateStamp dateStr={event.date} />
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-bold tracking-widest uppercase mb-1"
                style={{ color: GOLD }}
              >
                {event.category}
              </p>
              <h3
                className="text-xl font-medium leading-tight group-hover:opacity-80 transition-opacity line-clamp-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
              >
                {event.title}
              </h3>
            </div>
          </div>

          <div
            className="mt-4 pt-4 border-t space-y-2"
            style={{ borderColor: "#E2DBCD" }}
          >
            <div className="flex items-center gap-2 text-sm" style={{ color: "#5A6178" }}>
              <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
              <span>{event.time} CT</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#5A6178" }}>
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#5A6178" }}>
              <Users className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
              <span>
                {event.spotsLeft === 0
                  ? "Sold out"
                  : `${event.spotsLeft} spots left`}
              </span>
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

function ListCard({ event, index }: { event: ApiEvent; index: number }) {
  const imgUrl = getImageUrl(event);
  const price = priceDisplay(event);

  return (
    <Link href={`/events/${event.id}`}>
      <motion.article
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
        className="group cursor-pointer flex items-center gap-5 bg-white rounded-2xl border border-[#E2DBCD] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-4 overflow-hidden"
      >
        {/* Thumbnail */}
        <div
          className="w-[88px] h-[88px] shrink-0 rounded-xl overflow-hidden"
          style={{ backgroundColor: CREAM }}
        >
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={event.title}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                className="text-xl opacity-20"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
              >
                BB
              </span>
            </div>
          )}
        </div>

        {/* Date stamp */}
        <DateStamp dateStr={event.date} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-bold tracking-widest uppercase mb-0.5"
            style={{ color: GOLD }}
          >
            {event.category}
          </p>
          <h3
            className="font-medium text-lg leading-snug truncate group-hover:opacity-75 transition-opacity"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
          >
            {event.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm" style={{ color: "#5A6178" }}>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" style={{ color: GOLD }} />
              {formatDateShortCT(event.date)} · {event.time} CT
            </span>
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <MapPin className="w-3 h-3 shrink-0" style={{ color: GOLD }} />
              {event.location}
            </span>
          </div>
        </div>

        {/* Price + spots */}
        <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
          <span
            className="inline-block px-3 py-1 rounded-full text-sm font-bold"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            {price}
          </span>
          <span className="text-xs" style={{ color: "#5A6178" }}>
            {event.spotsLeft === 0 ? "Sold out" : `${event.spotsLeft} left`}
          </span>
        </div>
      </motion.article>
    </Link>
  );
}

export default function Events() {
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { data, isLoading } = useListEvents(
    showUpcomingOnly ? { upcoming: "true" } : {}
  );
  const events = data?.events;

  const filtered = events?.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full">

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "480px" }}>
        <img
          src={`${import.meta.env.BASE_URL}bougie-zebra-banner.png`}
          alt="Bougie Bams events"
          className="absolute inset-0 w-full h-full object-cover object-[50%_30%] md:object-[70%_30%]"
        />
        {/* gradient: dark at top for text, fades down */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, rgba(30,42,90,0.82) 0%, rgba(30,42,90,0.55) 50%, rgba(30,42,90,0.25) 100%)`,
          }}
        />

        <div className="relative z-10 flex flex-col justify-end h-full px-6 py-16 md:py-20 max-w-6xl mx-auto" style={{ minHeight: "480px" }}>
          <div className="max-w-2xl">
            {/* eyebrow */}
            <p
              className="text-xs font-bold tracking-[0.25em] uppercase mb-4"
              style={{ color: GOLD }}
            >
              BougieBams Events
            </p>

            <h1
              className="font-medium leading-none mb-5 text-white"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.75rem, 6vw, 5rem)",
                textShadow: "0 2px 20px rgba(0,0,0,0.3)",
              }}
            >
              Life's too short<br />for ordinary.
            </h1>

            <p className="text-base md:text-lg text-white/80 mb-8 font-light">
              Let's make mahjong{" "}
              <strong className="text-white font-bold">BOUGIE</strong> —{" "}
              <strong className="text-white font-bold">BAM!</strong>
            </p>

            {/* Pull quote */}
            <blockquote
              className="border-l-2 pl-5 py-1"
              style={{ borderColor: GOLD }}
            >
              <p className="text-sm md:text-base italic text-white/80 leading-relaxed">
                "Bougie Bams is more than a business. It's an extension of who
                I am — a colorful, slightly over-the-top Texan who believes
                life is better when people gather around a beautiful table."
              </p>
              <footer className="mt-2 text-xs font-medium tracking-wider uppercase" style={{ color: GOLD }}>
                — Patsy Miller, Founder &amp; CEO
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── Events Section ───────────────────────── */}
      <section className="py-16 min-h-[60vh]" style={{ backgroundColor: CREAM }}>
        <div className="container mx-auto px-4 max-w-7xl">

          {/* Controls row */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-10">

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: `${NAVY}60` }}
              />
              <Input
                placeholder="Search by name, location, or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 rounded-full border-[#D0C8B8] bg-white focus-visible:ring-1"
                style={{ "--tw-ring-color": GOLD } as React.CSSProperties}
              />
            </div>

            {/* Tabs + view toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Upcoming / Past underline tabs */}
              <div className="flex items-center">
                {(["Upcoming", "Past"] as const).map((label) => {
                  const active = (label === "Upcoming") === showUpcomingOnly;
                  return (
                    <button
                      key={label}
                      onClick={() => setShowUpcomingOnly(label === "Upcoming")}
                      className="px-4 py-2 text-sm font-medium transition-colors relative"
                      style={{ color: active ? NAVY : "#5A6178" }}
                    >
                      {label}
                      {active && (
                        <span
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                          style={{ backgroundColor: GOLD }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-[#D0C8B8]" />

              {/* View mode icons */}
              <div className="flex items-center gap-1 p-1 rounded-lg border border-[#D0C8B8] bg-white">
                {(
                  [
                    { mode: "grid" as ViewMode, Icon: LayoutGrid, label: "Grid view" },
                    { mode: "list" as ViewMode, Icon: LayoutList, label: "List view" },
                    { mode: "calendar" as ViewMode, Icon: CalendarDays, label: "Calendar view" },
                  ] as const
                ).map(({ mode, Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    aria-label={label}
                    className="p-1.5 rounded-md transition-colors"
                    style={
                      viewMode === mode
                        ? { backgroundColor: NAVY, color: "#fff" }
                        : { color: "#5A6178" }
                    }
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section heading */}
          {!isLoading && (filtered?.length ?? 0) > 0 && viewMode !== "calendar" && (
            <div className="flex items-center gap-4 mb-8">
              <h2
                className="text-2xl md:text-3xl font-medium shrink-0"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}
              >
                {showUpcomingOnly ? "Upcoming Events" : "Past Events"}
              </h2>
              <div className="flex-1 h-px" style={{ backgroundColor: `${GOLD}50` }} />
              {(filtered?.length ?? 0) > 0 && (
                <span className="text-sm shrink-0" style={{ color: "#5A6178" }}>
                  {filtered?.length} event{filtered?.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white border border-[#E2DBCD] animate-pulse">
                  <div className="aspect-[4/3] bg-[#E2DBCD]" />
                  <div className="p-5 space-y-3">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-xl bg-[#E2DBCD]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-[#E2DBCD] rounded w-1/3" />
                        <div className="h-5 bg-[#E2DBCD] rounded w-4/5" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#E2DBCD] space-y-2">
                      <div className="h-3 bg-[#E2DBCD] rounded w-1/2" />
                      <div className="h-3 bg-[#E2DBCD] rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <div className="text-center py-28">
              <p
                className="text-4xl font-medium mb-3"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY, opacity: 0.4 }}
              >
                No events found
              </p>
              <p className="text-sm mb-8" style={{ color: "#5A6178" }}>
                {search ? "Try a different search term." : "Check back soon — something bougie is always in the works."}
              </p>
              <Button
                variant="outline"
                className="rounded-full border-[#D0C8B8] hover:border-[#D4AF37]"
                onClick={() => { setShowUpcomingOnly(true); setSearch(""); }}
              >
                Clear filters
              </Button>
            </div>
          ) : viewMode === "calendar" ? (
            <CalendarView events={filtered ?? []} />
          ) : viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered?.map((event, i) => (
                <GridCard key={event.id} event={event} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered?.map((event, i) => (
                <ListCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Gallery ─────────────────────────────── */}
      <EventGallery />
    </div>
  );
}
