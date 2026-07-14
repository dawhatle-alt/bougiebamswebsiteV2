import { Router, type IRouter, type Response } from "express";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db, productsTable, eventsTable, blogPostsTable } from "@workspace/db";
import { getPublicStorageUrl } from "../lib/objectStorage";
import { logger } from "../lib/logger";

/**
 * Social link previews. The SPA's index.html carries one static set of Open
 * Graph tags (the logo) for every URL, and link scrapers (iMessage, Facebook,
 * WhatsApp) don't run JavaScript — so shared product links previewed as the
 * company logo. Detail-page routes are rewritten to this router (vercel.json),
 * which serves the same SPA shell with that page's title/description/image
 * swapped into the meta tags. Browsers load the identical app; scrapers see
 * the product.
 */
const router: IRouter = Router();

const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN ?? "https://bougiebams.com";
const FALLBACK_IMAGE = `${SITE_ORIGIN}/bougiebams-logo-social.jpg`;

let templateCache: string | null = null;

async function loadTemplate(): Promise<string | null> {
  if (templateCache) return templateCache;
  const candidates = [
    // Vercel: bundled via functions.includeFiles (cwd = /var/task)
    path.resolve(process.cwd(), "artifacts/bougiebams/dist/public/index.html"),
    // local dev from artifacts/api-server
    path.resolve(process.cwd(), "../..", "artifacts/bougiebams/dist/public/index.html"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        templateCache = fs.readFileSync(p, "utf8");
        return templateCache;
      }
    } catch {
      /* try next */
    }
  }
  // Last resort: fetch the deployed shell from the CDN.
  try {
    const res = await fetch(`${SITE_ORIGIN}/`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      templateCache = await res.text();
      return templateCache;
    }
  } catch {
    /* handled by caller */
  }
  return null;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface OgData {
  title: string;
  description: string;
  image: string;
  url: string;
}

function injectOg(template: string, og: OgData): string {
  const title = escapeAttr(og.title);
  const description = escapeAttr(og.description);
  const image = escapeAttr(og.image);
  const url = escapeAttr(og.url);
  const setMeta = (html: string, attr: "property" | "name", key: string, content: string) =>
    html.replace(
      new RegExp(`(<meta ${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" content=")[^"]*(")`),
      `$1${content}$2`,
    );

  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setMeta(html, "name", "twitter:image", image);
  return html;
}

// Direct Supabase render URL (no redirect hop — some scrapers won't follow
// redirects for og:image).
function storageImageUrl(imagePath: string | null | undefined, width: number): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  const normalized = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  if (!normalized.startsWith("/objects/")) return `${SITE_ORIGIN}/api/storage${normalized}`;
  const publicUrl = getPublicStorageUrl(normalized.slice("/objects/".length));
  if (!publicUrl.startsWith("http")) return null; // SUPABASE_URL not configured
  return `${publicUrl.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")}?width=${width}&height=${width}&resize=contain&quality=80`;
}

function firstSentences(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

async function serveShell(res: Response, og: OgData | null): Promise<void> {
  const template = await loadTemplate();
  if (!template) {
    // Shell unavailable (shouldn't happen) — send visitors to the SPA root.
    res.redirect(302, SITE_ORIGIN);
    return;
  }
  res.set("Content-Type", "text/html; charset=utf-8");
  // Short CDN cache: previews stay fresh when products change, repeat
  // shares don't invoke the function.
  res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.send(og ? injectOg(template, og) : template);
}

router.get("/shop/:id", async (req, res): Promise<void> => {
  try {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id as string));
    if (!p || !p.published) {
      await serveShell(res, null);
      return;
    }
    await serveShell(res, {
      title: `${p.name} — BougieBams`,
      description: firstSentences(p.description || `Shop the ${p.name} from BougieBams.`),
      image: storageImageUrl(p.imagePath, 1200) ?? FALLBACK_IMAGE,
      url: `${SITE_ORIGIN}/shop/${encodeURIComponent(p.id)}`,
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, "Product link preview failed");
    await serveShell(res, null);
  }
});

router.get("/events/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      // e.g. /events/confirmation — plain shell
      await serveShell(res, null);
      return;
    }
    const [e] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    if (!e || !e.published || e.archived) {
      await serveShell(res, null);
      return;
    }
    const price = e.priceCents ? `$${(e.priceCents / 100).toFixed(0)}` : "Free";
    await serveShell(res, {
      title: `${e.title} — BougieBams Events`,
      description: firstSentences(`${e.date} · ${e.location} · ${price}. ${e.description}`),
      image: storageImageUrl(e.imagePath, 1200) ?? FALLBACK_IMAGE,
      url: `${SITE_ORIGIN}/events/${e.id}`,
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, "Event link preview failed");
    await serveShell(res, null);
  }
});

router.get("/blog/:slug", async (req, res): Promise<void> => {
  try {
    const [b] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.slug, req.params.slug as string));
    if (!b || !b.published) {
      await serveShell(res, null);
      return;
    }
    await serveShell(res, {
      title: `${b.title} — BougieBams Journal`,
      description: firstSentences(b.excerpt || b.content),
      image: storageImageUrl(b.imagePath ?? b.coverImage, 1200) ?? FALLBACK_IMAGE,
      url: `${SITE_ORIGIN}/blog/${encodeURIComponent(b.slug)}`,
    });
  } catch (err) {
    logger.error({ err, slug: req.params.slug }, "Blog link preview failed");
    await serveShell(res, null);
  }
});

export default router;
