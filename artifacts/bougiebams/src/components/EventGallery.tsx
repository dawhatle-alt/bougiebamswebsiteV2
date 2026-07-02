import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

interface GalleryPhoto {
  id: number;
  url: string;
  caption: string | null;
  sortOrder: number;
}

function useFetchGallery() {
  return useQuery<{ photos: GalleryPhoto[] }>({
    queryKey: ["event-gallery"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/gallery`);
      if (!res.ok) return { photos: [] };
      return res.json() as Promise<{ photos: GalleryPhoto[] }>;
    },
    staleTime: 2 * 60 * 1000,
  });
}

function Lightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: GalleryPhoto[];
  startIndex: number;
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
            className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        </AnimatePresence>
        {photo.caption && (
          <motion.p
            key={`cap-${photo.id}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-white/80 text-sm text-center font-light italic max-w-xl"
          >
            {photo.caption}
          </motion.p>
        )}
        <p className="mt-2 text-white/40 text-xs">
          {index + 1} / {photos.length}
        </p>
      </div>
    </motion.div>
  );
}

export default function EventGallery() {
  const { data, isLoading } = useFetchGallery();
  const photos = data?.photos ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  if (photos.length === 0) return null;

  return (
    <>
      <section className="py-20 bg-background border-t border-border">
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

          <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
            {photos.map((photo, i) => (
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
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={photos}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
