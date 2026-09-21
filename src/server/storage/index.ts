import "server-only";
import { promises as fs } from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * Object-storage abstraction. Binaries never live in Postgres — only keys.
 * Dev uses a real on-disk LocalStorage; production uses any S3-compatible
 * bucket (AWS S3, Cloudflare R2, MinIO). All files are served through
 * /api/files/[...key] so access stays behind the app.
 */
export interface StorageProvider {
  readonly name: string;
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export { fileUrl } from "@/lib/file-url";

export function contentTypeFor(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
    case "json":
      return "application/json";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

class LocalStorage implements StorageProvider {
  readonly name = "local";
  private root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.STORAGE_DIR);

  private full(key: string) {
    // Prevent path traversal outside the storage root.
    const resolved = path.resolve(/*turbopackIgnore: true*/ this.root, key);
    if (!resolved.startsWith(this.root)) throw new Error("Invalid storage key");
    return resolved;
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const dest = this.full(key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, bytes);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.full(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.full(key));
    } catch {
      // already gone
    }
  }
}

class S3Storage implements StorageProvider {
  readonly name = "s3";
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
      throw new Error("S3 storage selected but S3_* env vars are incomplete");
    }
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: !!env.S3_ENDPOINT, // needed for MinIO / R2 custom endpoints
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    });
  }

  async put(key: string, bytes: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let cached: StorageProvider | null = null;
export function getStorage(): StorageProvider {
  if (cached) return cached;
  cached = env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
  return cached;
}
