import { useEffect } from "react";

const DEFAULT_TITLE = "BougieBams — Luxury Mahjong Sets, Accessories & Events";
const DEFAULT_DESCRIPTION =
  "A luxury, intimate mahjong community for everyone. Shop curated mahjong sets and accessories, join elevated game nights, and learn to play with BougieBams.";

/**
 * Sets the document title (and meta description) for the current page.
 * Pass null/undefined to restore the site-wide defaults. Titles are suffixed
 * with the brand automatically: "Shop … | BougieBams".
 *
 * Note: this runs client-side, so it affects browser tabs, history, and search
 * engines that render JS (Google) — not chat-app link previews, which read the
 * static index.html tags.
 */
export function setPageMeta(title?: string | null, description?: string | null) {
  document.title = title ? `${title} | BougieBams` : DEFAULT_TITLE;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", description ?? DEFAULT_DESCRIPTION);
}

export function usePageTitle(title?: string | null, description?: string | null) {
  useEffect(() => {
    setPageMeta(title, description);
  }, [title, description]);
}
