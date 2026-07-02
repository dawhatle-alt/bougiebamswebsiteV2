---
name: GCS object storage upload
description: How file uploads are wired to Replit Object Storage (GCS) in the BougieBams API server
---

The original upload system wrote files to `artifacts/api-server/uploads/` (local disk), which is ephemeral in production — files vanish on container restart/redeploy.

## Fix applied
- `POST /api/admin/storage/upload-url` now calls `ObjectStorageService.getObjectEntityUploadURL()` to generate a real GCS presigned PUT URL, and `normalizeObjectEntityPath()` to derive the objectPath.
- Client (GalleryManager.tsx) PUTs the file directly to the GCS presigned URL — no change needed on the client side.
- `GET /api/storage/*` now checks if the path starts with `objects/` and streams from GCS via `getObjectEntityFile` + `downloadObject`; falls back to local disk for legacy paths.

**Why:** Production deploys are stateless containers. Local disk writes are lost on every restart. GCS bucket persists independently.

**How to apply:** Any new file upload feature must use `ObjectStorageService` from `artifacts/api-server/src/lib/objectStorage.ts`. objectPath format for GCS uploads is `/objects/uploads/<uuid>`. The `executeSql` tool connects to Replit DB, NOT Supabase — to query/delete Supabase data use the API or DB connection string.
