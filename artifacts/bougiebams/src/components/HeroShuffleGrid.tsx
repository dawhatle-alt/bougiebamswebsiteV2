import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { images } from "@/data/images";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const FALLBACK_IMAGES = [
  images.heroTile1,
  images.heroTile2,
  images.heroTile3,
  images.heroTile4,
  images.productJade,
  images.productRosegold,
  images.mahjongTilesCloseup,
  images.mahjongLifestyle,
  images.heroTile1,
  images.heroTile2,
  images.heroTile3,
  images.heroTile4,
];

export function HeroShuffleGrid() {
  const [imageUrls, setImageUrls] = useState<string[]>(FALLBACK_IMAGES);
  const [order, setOrder] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i));

  useEffect(() => {
    fetch(`${API_BASE}/api/hero-images`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { images: { id: number; objectPath: string }[] } | null) => {
        // Use the admin-uploaded photos as soon as any exist — the grid repeats
        // them to fill all 12 tiles. Bundled defaults only show when none are set.
        if (data?.images && data.images.length > 0) {
          const urls = data.images.map((img) => `${API_BASE}/api/storage${img.objectPath}`);
          const repeated = Array.from({ length: 12 }, (_, i) => urls[i % urls.length]);
          setImageUrls(repeated);
          setOrder(Array.from({ length: 12 }, (_, i) => i));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOrder((prev) => {
        const newOrder = [...prev];
        const idx1 = Math.floor(Math.random() * newOrder.length);
        let idx2 = Math.floor(Math.random() * newOrder.length);
        while (idx1 === idx2) {
          idx2 = Math.floor(Math.random() * newOrder.length);
        }
        [newOrder[idx1], newOrder[idx2]] = [newOrder[idx2], newOrder[idx1]];
        return newOrder;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 bg-muted">
      <div className="grid grid-cols-3 md:grid-cols-4 grid-rows-4 md:grid-rows-3 gap-1 md:gap-2 h-full w-full p-1 md:p-2 opacity-75">
        {order.map((imgIndex, i) => (
          <motion.div
            key={i}
            layout
            transition={{ type: "spring", stiffness: 40, damping: 12 }}
            className="w-full h-full rounded-sm md:rounded-md overflow-hidden bg-background relative"
          >
            <img
              src={imageUrls[imgIndex]}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/20 to-transparent"></div>
          </motion.div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/30 to-background/70"></div>
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-background/55"></div>
    </div>
  );
}
