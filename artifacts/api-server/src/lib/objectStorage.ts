import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "media";

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage operations. " +
        "Add SUPABASE_SERVICE_ROLE_KEY to your environment secrets."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getPublicStorageUrl(filePath: string): string {
  const url = process.env.SUPABASE_URL ?? "";
  return `${url}/storage/v1/object/public/${BUCKET}/${filePath}`;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  /**
   * Returns a Supabase signed upload URL. The client PUTs the file directly to this URL.
   */
  async getObjectEntityUploadURL(): Promise<string> {
    const client = getServiceClient();
    const filePath = `uploads/${randomUUID()}`;
    const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(filePath);
    if (error || !data) {
      throw new Error(error?.message ?? "Could not create upload URL from Supabase Storage");
    }
    return data.signedUrl;
  }

  /**
   * Uploads bytes the server itself produced (e.g. an AI-generated tablescape)
   * and returns the internal /objects/... path to store on the row.
   */
  async uploadBuffer(buffer: Buffer, contentType: string, prefix = "uploads"): Promise<string> {
    const client = getServiceClient();
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    const filePath = `${prefix}/${randomUUID()}.${ext}`;
    const { error } = await client.storage.from(BUCKET).upload(filePath, buffer, {
      contentType,
      upsert: false,
    });
    if (error) {
      throw new Error(error.message ?? "Could not upload file to Supabase Storage");
    }
    return `/objects/${filePath}`;
  }

  /**
   * Converts a Supabase signed upload URL to an internal /objects/... path for DB storage.
   * e.g. https://xxx.supabase.co/storage/v1/object/upload/sign/media/uploads/uuid → /objects/uploads/uuid
   */
  normalizeObjectEntityPath(signedUrl: string): string {
    if (!signedUrl.startsWith("http")) return signedUrl;
    try {
      const url = new URL(signedUrl);
      const match = url.pathname.match(/\/storage\/v1\/object\/upload\/sign\/[^/]+\/(.+)/);
      if (match) return `/objects/${match[1]}`;
    } catch {
      // fall through
    }
    return signedUrl;
  }

  /**
   * Resolves an internal /objects/... path to a Supabase public URL reference.
   */
  async getObjectEntityFile(objectPath: string): Promise<{ path: string; publicUrl: string }> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const filePath = objectPath.slice("/objects/".length);
    return { path: filePath, publicUrl: getPublicStorageUrl(filePath) };
  }

  /**
   * Fetches a file from its Supabase public URL.
   */
  async downloadObject(file: { publicUrl: string }): Promise<Response> {
    const response = await fetch(file.publicUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new ObjectNotFoundError();
    return response;
  }
}
