import { Router, type IRouter } from "express";
import { Readable } from "stream";
import { ObjectStorageService } from "../lib/objectStorage";
import { requireAdmin } from "./admin";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

// Admin-only: get a presigned URL to upload a public file (blog cover image)
// directly to storage. The client PUTs the file bytes to `uploadURL`, then
// stores `objectPath`. Uploads land in the PUBLIC namespace only.
router.post("/admin/storage/upload-url", requireAdmin, async (req, res) => {
  try {
    const { uploadURL, objectPath } = await objectStorage.getPublicUploadURL();
    return res.json({ uploadURL, objectPath });
  } catch (err) {
    req.log.error({ err }, "Failed to create upload URL");
    return res
      .status(500)
      .json({ error: "Could not start the upload. Please try again." });
  }
});

// Public: serve a public object (blog cover images). Scoped to the public
// namespace only — private objects are never reachable through this route.
router.get(/^\/storage\/public-objects\/(.+)$/, async (req, res) => {
  const filePath = req.params[0];
  try {
    const file = await objectStorage.searchPublicObject(filePath);
    if (!file) {
      return res.status(404).json({ error: "File not found." });
    }
    const response = await objectStorage.downloadObject(file);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("X-Content-Type-Options", "nosniff");

    // These uploads are meant to be images. An uploaded HTML or SVG file served
    // inline from this same origin would be a stored-XSS vector, so only let a
    // strict allowlist of raster image types render inline; anything else
    // (including image/svg+xml) is forced to a non-executable type and
    // downloaded as an attachment.
    const INLINE_SAFE = new Set([
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/avif",
    ]);
    const contentType = (res.getHeader("Content-Type") as string) || "";
    const baseType = contentType.split(";")[0].trim().toLowerCase();
    if (INLINE_SAFE.has(baseType)) {
      res.setHeader("Content-Disposition", "inline");
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", "attachment");
    }

    res.status(response.status);
    if (response.body) {
      Readable.fromWeb(
        response.body as Parameters<typeof Readable.fromWeb>[0],
      ).pipe(res);
    } else {
      res.end();
    }
    return;
  } catch (err) {
    req.log.error({ err }, "Failed to serve object");
    return res.status(500).json({ error: "Could not load the file." });
  }
});

export default router;
