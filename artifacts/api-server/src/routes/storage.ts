import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.get("/storage/{*splat}", async (req, res): Promise<void> => {
  const splatParam = req.params as { splat?: string | string[] };
  const splat = Array.isArray(splatParam.splat)
    ? splatParam.splat.join("/")
    : (splatParam.splat ?? "");
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
