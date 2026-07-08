import React, { useMemo } from "react";

export interface SliderPhoto {
  id: number;
  url: string;
  caption: string | null;
}

interface ImageAutoSliderProps {
  photos: SliderPhoto[];
  /** Called with the index into the ORIGINAL photos array. */
  onPhotoClick?: (index: number) => void;
}

/**
 * Infinite auto-scrolling image strip. The photo list is repeated to fill the
 * loop, then duplicated once more so the -50% keyframe wraps seamlessly.
 * Pauses on hover so photos can be clicked; falls back to a manually
 * scrollable row when the visitor prefers reduced motion.
 */
export function ImageAutoSlider({ photos, onPhotoClick }: ImageAutoSliderProps) {
  const loop = useMemo(() => {
    if (photos.length === 0) return [];
    const base: SliderPhoto[] = [];
    while (base.length < 10) base.push(...photos);
    return [...base, ...base];
  }, [photos]);

  if (loop.length === 0) return null;

  // Constant perceived speed regardless of how many photos are in the loop.
  const durationSeconds = Math.max(20, (loop.length / 2) * 4);

  return (
    <>
      <style>{`
        @keyframes gallery-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .gallery-auto-scroll {
          animation: gallery-scroll var(--scroll-duration, 40s) linear infinite;
        }
        .gallery-auto-scroll:hover {
          animation-play-state: paused;
        }
        .gallery-scroll-mask {
          overflow: hidden;
          mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
        }
        @media (prefers-reduced-motion: reduce) {
          .gallery-auto-scroll { animation: none; }
          .gallery-scroll-mask { overflow-x: auto; }
        }
      `}</style>

      <div className="gallery-scroll-mask w-full">
        <div
          className="gallery-auto-scroll flex gap-4 w-max py-2"
          style={{ "--scroll-duration": `${durationSeconds}s` } as React.CSSProperties}
        >
          {loop.map((photo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPhotoClick?.(i % photos.length)}
              className="group flex-shrink-0 w-44 h-44 md:w-60 md:h-60 lg:w-72 lg:h-72 rounded-xl overflow-hidden shadow-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary outline-none"
              aria-label={photo.caption ?? "View event photo"}
              tabIndex={i < photos.length ? 0 : -1}
            >
              <img
                src={photo.url}
                alt={photo.caption ?? "Event photo"}
                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
