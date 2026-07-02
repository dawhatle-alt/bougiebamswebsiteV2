import { useRef, useCallback, useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import type { FavoriteProduct } from "@/data/favorites";

const PALETTES = [
  { c0: "#fff0f5", c1: "#ffd6e4", c2: "#ffc2d4", shadow: "rgba(150,50,90,.22)" },
  { c0: "#fdf6e6", c1: "#f3e2b6", c2: "#e9d199", shadow: "rgba(110,85,30,.22)" },
  { c0: "#f6f2fb", c1: "#e6ddf2", c2: "#d8cfe9", shadow: "rgba(70,60,110,.20)" },
  { c0: "#ecf8fb", c1: "#d2ebf1", c2: "#bfe2ec", shadow: "rgba(30,90,105,.20)" },
  { c0: "#f5f3e8", c1: "#e6e1ca", c2: "#dad3b4", shadow: "rgba(90,85,40,.20)" },
  { c0: "#ffeff5", c1: "#ffd6e4", c2: "#ffc2d6", shadow: "rgba(150,50,90,.20)" },
  { c0: "#fbf0e8", c1: "#f3ddc9", c2: "#ecd0b8", shadow: "rgba(130,80,40,.20)" },
  { c0: "#eff7fc", c1: "#d8ebf5", c2: "#c6dfee", shadow: "rgba(30,70,100,.20)" },
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  product: FavoriteProduct;
}

export function FloatingProductCard({ product }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const palette = PALETTES[hashId(product.id) % PALETTES.length];

  useEffect(() => {
    setImgFailed(false);
  }, [product.image]);

  const hasRealUrl = Boolean(product.image) && !product.image.startsWith("/images/");

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", ((px - 0.5) * 15).toFixed(2) + "deg");
    el.style.setProperty("--rx", ((0.5 - py) * 12).toFixed(2) + "deg");
    el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
    el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "30%");
  }, []);

  return (
    <div
      ref={stageRef}
      className="relative overflow-hidden"
      style={{
        borderRadius: "26px",
        perspective: "1000px",
        background: `radial-gradient(125% 120% at 50% 32%, ${palette.c0} 0%, ${palette.c1} 62%, ${palette.c2} 100%)`,
        boxShadow: `0 22px 55px -22px ${palette.shadow}, inset 0 0 0 1px rgba(255,255,255,.5)`,
        transition: "transform .3s ease, box-shadow .3s ease",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Cursor spotlight */}
      <div
        className="absolute pointer-events-none z-[3]"
        style={{
          inset: "0 0 88px 0",
          mixBlendMode: "soft-light",
          background:
            "radial-gradient(circle at var(--mx,50%) var(--my,30%), rgba(255,255,255,.6), transparent 55%)",
        }}
      />

      {/* Pedestal — tilts in 3D toward the cursor */}
      <div
        className="relative z-[2] h-[302px] flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
          transition: "transform .3s ease-out",
        }}
      >
        {/* Elliptical ground shadow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[150px] h-6 rounded-full"
          style={{
            bottom: "50px",
            background: `radial-gradient(ellipse, ${palette.shadow}, transparent 70%)`,
            filter: "blur(4px)",
          }}
        />

        {hasRealUrl && !imgFailed ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="bb-float max-h-[236px] max-w-[264px] object-contain rounded-3xl"
            style={{
              filter: `drop-shadow(0 22px 18px ${palette.shadow})`,
            }}
          />
        ) : (
          <span className="font-serif text-5xl select-none opacity-20">BB</span>
        )}
      </div>

      {/* Label */}
      <div className="relative z-[4] text-center px-6 pb-7">
        <h3
          className="font-serif text-[1.45rem] font-semibold leading-snug m-0"
          style={{ color: "#3d2a1e" }}
        >
          {product.name}
        </h3>
        <span
          className="block text-[11px] uppercase tracking-[.2em] mt-1"
          style={{ color: "#9a7186" }}
        >
          {product.category}
        </span>
        <p
          className="text-sm mt-3 mb-4 leading-relaxed"
          style={{ color: "#6b5149" }}
        >
          {product.description}
        </p>
        <a
          href={product.affiliateUrl}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #b08a1e 0%, #C9A227 50%, #ddb93a 100%)",
          }}
        >
          View on Amazon
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>
    </div>
  );
}
