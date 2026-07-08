import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight, Camera, Copy, Check, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { parseCalendarDate } from "@/lib/dateUtils";
import { useListEvents } from "@workspace/api-client-react";
import { ImageAutoSlider } from "@/components/ui/image-auto-slider";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

const NAVY = "#1E2A5A";
const GOLD = "#D4AF37";

interface GalleryPhoto {
  id: number;
  url: string;
  caption: string | null;
  eventId: number | null;
  isCover: boolean;
  sortOrder: number;
}

interface GalleryAlbum {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  totalSpots: number;
  spotsLeft: number;
  photoCount: number;
  coverUrl: string | null;
}

interface GalleryResponse {
  photos: GalleryPhoto[];
  albums: GalleryAlbum[];
}

function useFetchGallery() {
  return useQuery<GalleryResponse>({
    queryKey: ["event-gallery"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/gallery`);
      if (!res.ok) return { photos: [], albums: [] };
      return res.json() as Promise<GalleryResponse>;
    },
    staleTime: 2 * 60 * 1000,
  });
}

function venueShort(location: string): string {
  return location.split(",")[0].trim();
}

function dateShort(dateStr: string): string {
  const d = parseCalendarDate(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : format(d, "MMM d, yyyy");
}

function dateLong(dateStr: string): string {
  const d = parseCalendarDate(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : format(d, "EEEE, MMMM d, yyyy");
}

/* ── Mahjong-tile faces ─────────────────────────────────────────── */

const IVORY_FACE: React.CSSProperties = {
  background:
    "radial-gradient(120% 90% at 30% 12%, rgba(255,255,255,.9), rgba(255,255,255,0) 55%), linear-gradient(160deg, #FEFCF7 0%, #F4EEDF 60%, #EAE1CC 100%)",
  boxShadow:
    "inset 0 2px 0 rgba(255,255,255,.9), inset 0 -5px 10px rgba(148,124,70,.22), inset 3px 0 6px rgba(255,255,255,.5), inset -3px 0 8px rgba(148,124,70,.12), 0 10px 22px -8px rgba(25,30,51,.28)",
  border: "1px solid rgba(148,124,70,.25)",
};

function BamSticks({ count, className }: { count: number; className?: string }) {
  const stick = (x: number, y: number, h: number) => (
    <g key={`${x}-${y}`} transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width="13" height={h} rx="6" fill="#C9A431" />
      <rect x="1.5" y="1.5" width="10" height={h - 3} rx="4.5" fill={GOLD} />
      <rect x="0" y={h * 0.33} width="13" height="3.5" rx="1.75" fill={NAVY} />
      <rect x="0" y={h * 0.62} width="13" height="3.5" rx="1.75" fill={NAVY} />
    </g>
  );
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
      {count === 1 && stick(43.5, 26, 68)}
      {count === 2 && [stick(28, 26, 68), stick(59, 26, 68)]}
      {count >= 3 && [stick(43.5, 14, 44), stick(24, 64, 44), stick(63, 64, 44)]}
    </svg>
  );
}

function FlowerMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx="50" cy="34" rx="11" ry="17"
          fill="#B57FD3" opacity="0.85"
          transform={`rotate(${deg} 50 56)`}
        />
      ))}
      <circle cx="50" cy="56" r="8.5" fill={GOLD} />
    </svg>
  );
}

/* ── Flip tile ──────────────────────────────────────────────────── */

function FlipTile({
  front,
  back,
  onOpen,
  label,
  active,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  onOpen: () => void;
  label: string;
  active: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      aria-label={label}
      className={`relative block w-full cursor-pointer rounded-2xl outline-none transition-shadow ${
        active
          ? "ring-[3px] ring-primary ring-offset-[3px] ring-offset-background"
          : "focus-visible:ring-2 focus-visible:ring-primary ring-offset-2 ring-offset-background"
      }`}
      style={{ perspective: 900 }}
    >
      <motion.div
        className="relative w-full aspect-[3/4]"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.35, 0.1, 0.25, 1] }}
      >
        <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
          {front}
        </div>
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {back}
        </div>
      </motion.div>
    </button>
  );
}

function TileScrim({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-end p-3"
      style={{ background: "linear-gradient(to top, rgba(25,30,51,.88) 0%, rgba(25,30,51,.25) 55%, rgba(25,30,51,0) 80%)" }}
    >
      <span className="font-serif italic font-semibold text-white text-[17px] leading-tight text-left">{title}</span>
      <span className="text-white/75 text-[10.5px] tracking-wide mt-1 text-left">{meta}</span>
    </div>
  );
}

function TileInfoBack({
  motif,
  lines,
  soldOut,
  action,
}: {
  motif: React.ReactNode;
  lines: string[];
  soldOut?: boolean;
  action: string;
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center rounded-2xl" style={IVORY_FACE}>
      <div className="w-11">{motif}</div>
      <div className="flex flex-col gap-0.5 text-[11px] leading-snug text-muted-foreground">
        {lines.map((l) => (
          <span key={l} className={l === lines[0] ? "font-semibold text-foreground" : undefined}>{l}</span>
        ))}
        {soldOut && (
          <span className="font-bold uppercase tracking-widest text-[9.5px]" style={{ color: "#B8942A" }}>
            Sold out
          </span>
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#B8942A" }}>
        {action} →
      </span>
    </div>
  );
}

/* ── Lightbox ───────────────────────────────────────────────────── */

function Lightbox({
  photos,
  startIndex,
  albumTitleFor,
  onSeeAlbum,
  onClose,
}: {
  photos: GalleryPhoto[];
  startIndex: number;
  albumTitleFor: (eventId: number | null) => string | null;
  onSeeAlbum: (eventId: number) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const photo = photos[index];

  const prev = useCallback(() => setIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!photo) return null;
  const albumTitle = albumTitleFor(photo.eventId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10 bg-black/30 rounded-full p-2"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors z-10 bg-black/30 rounded-full p-3"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors z-10 bg-black/30 rounded-full p-3"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div
        className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={photo.id}
            src={photo.url}
            alt={photo.caption ?? "Event photo"}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="max-h-[76vh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        </AnimatePresence>
        {albumTitle && (
          <span
            className="mt-4 inline-block rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            {albumTitle}
          </span>
        )}
        {photo.caption && (
          <motion.p
            key={`cap-${photo.id}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${albumTitle ? "mt-2" : "mt-4"} text-white/80 text-sm text-center font-light italic max-w-xl`}
          >
            {photo.caption}
          </motion.p>
        )}
        <p className="mt-2 text-white/40 text-xs">
          {index + 1} / {photos.length}
        </p>
        {photo.eventId !== null && albumTitle && (
          <button
            onClick={() => onSeeAlbum(photo.eventId as number)}
            className="mt-2 text-xs font-semibold transition-colors border-b pb-px"
            style={{ color: GOLD, borderColor: "rgba(212,175,55,.4)" }}
          >
            See all moments from this night →
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

export default function EventGallery() {
  const { data, isLoading } = useFetchGallery();
  const { data: upcomingData } = useListEvents({ upcoming: true });
  const photos = useMemo(() => data?.photos ?? [], [data]);
  const albums = useMemo(() => data?.albums ?? [], [data]);

  const [album, setAlbum] = useState<number | "all">("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const albumsWithPhotos = useMemo(() => albums.filter((a) => a.photoCount > 0), [albums]);
  const comingSoon = useMemo(() => albums.filter((a) => a.photoCount === 0), [albums]);
  const currentAlbum = album === "all" ? null : albumsWithPhotos.find((a) => a.id === album) ?? null;

  const visiblePhotos = useMemo(
    () => (album === "all" ? photos : photos.filter((p) => p.eventId === album)),
    [photos, album]
  );

  const albumTitleFor = useCallback(
    (eventId: number | null) => albums.find((a) => a.id === eventId)?.title ?? null,
    [albums]
  );

  const openAlbum = useCallback((next: number | "all") => {
    setAlbum(next);
    setLightboxIndex(null);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("moments");
    else url.searchParams.set("moments", String(next));
    window.history.replaceState(null, "", url.toString());
  }, []);

  // Deep link: /events?moments=<eventId> opens that album (used in
  // post-event "relive the night" emails).
  useEffect(() => {
    if (albumsWithPhotos.length === 0) return;
    const m = new URLSearchParams(window.location.search).get("moments");
    if (!m) return;
    const id = parseInt(m, 10);
    if (!Number.isNaN(id) && albumsWithPhotos.some((a) => a.id === id)) {
      setAlbum(id);
      document.getElementById("community-moments")?.scrollIntoView({ behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumsWithPhotos.length]);

  const nextEvent = useMemo(() => {
    const list = upcomingData?.events ?? [];
    return list.find((e) => e.id !== album) ?? null;
  }, [upcomingData, album]);

  function copyAlbumLink() {
    if (album === "all") return;
    const link = `${window.location.origin}${window.location.pathname}?moments=${album}`;
    void navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isLoading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 animate-pulse">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <div
                key={i}
                className="bg-muted rounded-xl mb-3 break-inside-avoid"
                style={{ height: `${[200,280,220,300,240,260,190,310][i-1]}px` }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (photos.length === 0 && albums.length === 0) return null;

  const showTileWall = albumsWithPhotos.length > 0;

  return (
    <>
      <section id="community-moments" className="py-20 bg-background border-t border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Camera className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Community Moments</span>
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-medium text-foreground">
                From the Table
              </h2>
            </div>
            <p className="hidden md:block text-muted-foreground font-serif text-base max-w-xs text-right">
              Laughter, tiles, and unforgettable nights — this is what bougie looks like.
            </p>
          </div>

          {/* ── The Tile Wall ── */}
          {showTileWall && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                  The Tile Wall — pick a night
                </span>
                <div className="h-px bg-border flex-1" />
              </div>

              <div className="flex gap-5 items-start overflow-x-auto pb-5 px-1 snap-x">
                {/* All Moments */}
                <div className="flex-none w-[140px] md:w-[168px] snap-start flex flex-col gap-2.5">
                  <FlipTile
                    label="View all moments"
                    active={album === "all"}
                    onOpen={() => openAlbum("all")}
                    front={
                      <div className="w-full h-full" style={{ backgroundColor: NAVY }}>
                        <div className="grid grid-rows-2 h-full">
                          {photos.slice(0, 2).map((p) => (
                            <img key={p.id} src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ))}
                        </div>
                        <TileScrim title="All Moments" meta={`${photos.length} moments · every night`} />
                      </div>
                    }
                    back={
                      <TileInfoBack
                        motif={<FlowerMotif className="w-full" />}
                        lines={["The whole collection", `${photos.length} moments and counting`]}
                        action="View everything"
                      />
                    }
                  />
                  <div className="text-center">
                    <p className="text-[12.5px] font-semibold leading-tight text-foreground">All Moments</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">The whole collection</p>
                  </div>
                </div>

                {/* one tile per event album */}
                {albumsWithPhotos.map((a, i) => {
                  const soldOut = a.totalSpots > 0 && a.spotsLeft === 0;
                  return (
                    <div key={a.id} className="flex-none w-[140px] md:w-[168px] snap-start flex flex-col gap-2.5">
                      <FlipTile
                        label={`Open album: ${a.title}`}
                        active={album === a.id}
                        onOpen={() => openAlbum(a.id)}
                        front={
                          <div className="w-full h-full" style={{ backgroundColor: NAVY }}>
                            {a.coverUrl && (
                              <img src={a.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                            )}
                            <TileScrim title={a.title} meta={`${dateShort(a.date)} · ${a.photoCount} moments`} />
                          </div>
                        }
                        back={
                          <TileInfoBack
                            motif={<BamSticks count={(i % 3) + 1} className="w-full" />}
                            lines={[venueShort(a.location), `${a.totalSpots} seats`]}
                            soldOut={soldOut}
                            action="Open album"
                          />
                        }
                      />
                      <div className="text-center">
                        <p className="text-[12.5px] font-semibold leading-tight text-foreground line-clamp-2">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{dateShort(a.date)} · {venueShort(a.location)}</p>
                      </div>
                    </div>
                  );
                })}

                {/* recent past events still waiting on photos */}
                {comingSoon.map((a) => (
                  <div key={a.id} className="flex-none w-[140px] md:w-[168px] snap-start flex flex-col gap-2.5">
                    <div className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-3 p-3" style={IVORY_FACE}>
                      <BamSticks count={3} className="w-11" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground text-center leading-relaxed">
                        Photos<br />coming soon
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-[12.5px] font-semibold leading-tight text-foreground line-clamp-2">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{dateShort(a.date)} · {venueShort(a.location)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Album band ── */}
          {currentAlbum && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl px-7 py-6 mb-7 mt-2 flex flex-wrap items-center gap-x-8 gap-y-4 text-white"
              style={{ backgroundColor: NAVY }}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 w-52 h-52"
                style={{ background: "radial-gradient(circle, rgba(212,175,55,.22), transparent 70%)" }}
              />
              <div className="flex-1 basis-80 min-w-0">
                <button
                  onClick={() => openAlbum("all")}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] mb-2 transition-colors hover:text-white"
                  style={{ color: GOLD }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  All moments
                </button>
                <h3 className="font-serif italic font-semibold text-2xl md:text-4xl leading-tight">{currentAlbum.title}</h3>
                <div className="flex flex-wrap items-center gap-y-1.5 mt-3 text-[13px] text-white/85">
                  <span>{dateLong(currentAlbum.date)}</span>
                  <span className="mx-2.5" style={{ color: GOLD }}>•</span>
                  <span>{currentAlbum.location}</span>
                  <span className="mx-2.5" style={{ color: GOLD }}>•</span>
                  <span>{currentAlbum.totalSpots} seats</span>
                  {currentAlbum.totalSpots > 0 && currentAlbum.spotsLeft === 0 && (
                    <>
                      <span className="mx-2.5" style={{ color: GOLD }}>•</span>
                      <span className="font-bold uppercase tracking-wider text-[11.5px]" style={{ color: GOLD }}>Sold out</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-none flex flex-col gap-2 items-start">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Relive the night</span>
                <button
                  onClick={copyAlbumLink}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-mono transition-colors"
                  style={{ borderColor: copied ? GOLD : "rgba(255,255,255,.22)", backgroundColor: "rgba(255,255,255,.1)" }}
                >
                  {copied ? "Link copied!" : `bougiebams.com/events?moments=${currentAlbum.id}`}
                  {copied ? <Check className="w-3.5 h-3.5" style={{ color: GOLD }} /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
                </button>
                <span className="text-[11px] text-white/50">Share this link so guests can find their night</span>
              </div>
            </motion.div>
          )}

          {/* All Moments: infinite auto-scrolling strip; album view: browsable grid */}
          {album === "all" ? (
            <ImageAutoSlider photos={photos} onPhotoClick={(i) => setLightboxIndex(i)} />
          ) : (
          <div key={String(album)} className="columns-2 md:columns-3 lg:columns-4 gap-3">
            {visiblePhotos.map((photo, i) => {
              return (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 8) * 0.06, duration: 0.4 }}
                  className="relative mb-3 break-inside-avoid group cursor-pointer overflow-hidden rounded-xl"
                  onClick={() => setLightboxIndex(i)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption ?? `Event photo ${i + 1}`}
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-white text-xs font-medium leading-snug line-clamp-2">
                        {photo.caption}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 ring-2 ring-primary/0 group-hover:ring-primary/30 transition-all duration-300 rounded-xl pointer-events-none" />
                </motion.div>
              );
            })}
          </div>
          )}

          {/* ── Next-event tie-in ── */}
          {currentAlbum && nextEvent && (
            <div className="mt-9 rounded-2xl border border-border bg-card px-7 py-7 flex flex-wrap items-center gap-x-9 gap-y-5">
              <div className="flex-1 basis-72">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "#B8942A" }}>
                  Want to be in the next one?
                </p>
                <h4 className="font-serif font-semibold text-2xl md:text-[27px] leading-tight text-foreground">{nextEvent.title}</h4>
                <p className="text-sm text-muted-foreground mt-1.5">
                  <span className="font-semibold text-foreground">{dateLong(nextEvent.date)}</span>
                  {nextEvent.time ? ` · ${nextEvent.time}` : ""} · {venueShort(nextEvent.location)}
                </p>
              </div>
              <div className="text-center">
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-full px-7 py-3.5 text-[12.5px] font-bold uppercase tracking-widest transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: GOLD, color: NAVY, boxShadow: "0 6px 16px -6px rgba(184,148,42,.55)" }}
                >
                  Save your seat
                </button>
                {nextEvent.spotsLeft > 0 && nextEvent.spotsLeft <= 5 && (
                  <p className="text-[11.5px] text-muted-foreground mt-2">Only {nextEvent.spotsLeft} seats left</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={visiblePhotos}
            startIndex={lightboxIndex}
            albumTitleFor={albumTitleFor}
            onSeeAlbum={(eventId) => openAlbum(eventId)}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
