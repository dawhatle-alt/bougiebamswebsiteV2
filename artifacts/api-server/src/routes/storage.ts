import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const objectStorage = new ObjectStorageService();

router.get("/storage/{*splat}", async (req, res): Promise<void> => {
  const splatParam = req.params as { splat?: string | string[] };
  const splat = Array.isArray(splatParam.splat)
    ? splatParam.splat.join("/")
    : (splatParam.splat ?? "");

  if (splat.startsWith("objects/")) {
    try {
      const objectPath = `/${splat}`;
      const file = await objectStorage.getObjectEntityFile(objectPath);
      const response = await objectStorage.downloadObject(file);
      const contentType = response.headers.get("Content-Type") ?? "application/octet-stream";
      const cacheControl = response.headers.get("Cache-Control") ?? "private, max-age=3600";
      const contentLength = response.headers.get("Content-Length");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", cacheControl);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const arrayBuffer = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "File not found" });
      } else {
        logger.error({ err }, "GCS serve error");
        res.status(500).json({ error: "Storage error" });
      }
    }
    return;
  }

  const filePath = path.resolve(uploadsDir, splat);
  if (!filePath.startsWith(uploadsDir)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

export default router;
