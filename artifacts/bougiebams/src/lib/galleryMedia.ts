// Helpers for gallery media items: photos, uploaded videos, and external
// (YouTube/Vimeo) video links.

export type GalleryMediaType = "photo" | "video" | "external";

export const isVideoMedia = (t?: string | null): boolean => t === "video" || t === "external";

export function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  return m ? m[1] : null;
}

export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  return m ? m[1] : null;
}

// Embed URL for the lightbox player (autoplays once opened).
export function externalEmbedSrc(url: string): string | null {
  const yt = youTubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`;
  const vm = vimeoId(url);
  if (vm) return `https://player.vimeo.com/video/${vm}?autoplay=1`;
  return null;
}

// Poster image for grid tiles. YouTube provides one; Vimeo needs an API call,
// so those fall back to a dark tile with a play badge.
export function externalThumbUrl(url: string): string | null {
  const yt = youTubeId(url);
  return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null;
}
