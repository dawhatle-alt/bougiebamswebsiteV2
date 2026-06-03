import { Router, type IRouter } from "express";
import { Readable } from "stream";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import { requireAdmin } from "./admin";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

// Admin-only: get a presigned URL to upload a file directly to storage.
// The client PUTs the file bytes to `uploadURL`, then stores `objectPath`.
router.post("/admin/storage/upload-url", requireAdmin, async (req, res) => {
  try {
    const uploadURL = await objectStorage.getObjectEntityUploadURL();
    const objectPath = objectStorage.normalizeObjectEntityPath(uploadURL);
    return res.json({ uploadURL, objectPath });
  } catch (err) {
    req.log.error({ err }, "Failed to create upload URL");
    return res
      .status(500)
      .json({ error: "Could not start the upload. Please try again." });
  }
});

// Public: serve an uploaded object (blog cover images are public content).
router.get(/^\/storage\/objects\/(.+)$/, async (req, res) => {
  const objectPath = `/objects/${req.params[0]}`;
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const response = await objectStorage.downloadObject(file);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.status(response.status);
    if (response.body) {
      Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    } else {
      res.end();
    }
    return;
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "File not found." });
    }
    req.log.error({ err }, "Failed to serve object");
    return res.status(500).json({ error: "Could not load the file." });
  }
});

export default router;
