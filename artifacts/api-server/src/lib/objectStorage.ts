import { randomUUID } from "crypto";
import { Readable } from "stream";
import type { File, Storage } from "@google-cloud/storage";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getObjectAclPolicy } from "./objectAcl";

/**
 * Attachment storage. Two backends, chosen by STORAGE_BACKEND:
 *
 * - default: Replit Object Storage (GCS through the Replit sidecar).
 * - "s3": any S3-compatible store (Cloudflare R2 in production).
 *
 * Stored object paths (`/objects/uploads/<uuid>`) are the same for both. In S3
 * the key is PRIVATE_OBJECT_DIR minus its first segment (the Replit bucket
 * name), so a file copied key-for-key from Replit keeps its database path.
 */

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const useS3 = () => process.env.STORAGE_BACKEND === "s3";

let gcsClient: Storage | undefined;
async function gcs(): Promise<Storage> {
  if (!gcsClient) {
    const { Storage } = await import("@google-cloud/storage");
    gcsClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: { type: "json", subject_token_field_name: "access_token" },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });
  }
  return gcsClient;
}

let s3Config: { client: S3Client; bucket: string } | undefined;
function s3() {
  if (!s3Config) {
    const endpoint = process.env.S3_ENDPOINT;
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set");
    }
    s3Config = {
      bucket,
      client: new S3Client({
        endpoint,
        region: process.env.S3_REGION ?? "auto",
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "0",
        credentials: { accessKeyId, secretAccessKey },
        // R2 rejects the SDK's default CRC32 checksums on presigned uploads.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      }),
    };
  }
  return s3Config;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
  }
}

/** A stored object, independent of the backend. */
export interface StoredObject {
  info(): Promise<{ contentType?: string; size?: number; isPublic: boolean }>;
  createReadStream(): Readable;
}

function gcsObject(file: File): StoredObject {
  return {
    async info() {
      const [metadata] = await file.getMetadata();
      const acl = await getObjectAclPolicy(file);
      return {
        contentType: metadata.contentType,
        size: metadata.size === undefined ? undefined : Number(metadata.size),
        isPublic: acl?.visibility === "public",
      };
    },
    createReadStream: () => file.createReadStream(),
  };
}

function isS3NotFound(error: unknown): boolean {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NotFound" || e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404;
}

/** Returns null when the key does not exist. */
async function s3Object(key: string, isPublic: boolean): Promise<StoredObject | null> {
  const { client, bucket } = s3();
  let head;
  try {
    head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (isS3NotFound(error)) return null;
    throw error;
  }
  return {
    async info() {
      return { contentType: head.ContentType, size: head.ContentLength, isPublic };
    },
    createReadStream() {
      const out = new Readable({ read() {} });
      client.send(new GetObjectCommand({ Bucket: bucket, Key: key })).then(
        (response) => {
          const body = response.Body as Readable | undefined;
          if (!body) {
            out.push(null);
            return;
          }
          body.on("data", (chunk) => out.push(chunk));
          body.on("end", () => out.push(null));
          body.on("error", (error) => out.destroy(error));
        },
        (error) => out.destroy(isS3NotFound(error) ? new ObjectNotFoundError() : error),
      );
      return out;
    },
  };
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  const parts = (path.startsWith("/") ? path : `/${path}`).split("/");
  if (parts.length < 3 || !parts[1] || !parts.slice(2).join("/")) {
    throw new Error("Invalid object path");
  }
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

export class ObjectStorageService {
  getPublicObjectSearchPaths(): string[] {
    const paths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean);
    if (!paths.length) throw new Error("PUBLIC_OBJECT_SEARCH_PATHS is not set");
    return [...new Set(paths)];
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR ?? "";
    if (!dir) throw new Error("PRIVATE_OBJECT_DIR is not set");
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<StoredObject | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const { bucketName, objectName } = parseObjectPath(`${searchPath}/${filePath}`);
      if (useS3()) {
        const object = await s3Object(objectName, true);
        if (object) return object;
        continue;
      }
      const file = (await gcs()).bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      if (exists) return gcsObject(file);
    }
    return null;
  }

  async downloadObject(object: StoredObject, cacheTtlSec = 3600): Promise<Response> {
    const info = await object.info();
    const stream = Readable.toWeb(object.createReadStream()) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": info.contentType ?? "application/octet-stream",
      "Cache-Control": `${info.isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (info.size) headers["Content-Length"] = String(info.size);
    return new Response(stream, { headers });
  }

  /** A presigned PUT URL for a new private upload, plus the path to store for it. */
  async getObjectEntityUpload(): Promise<{ uploadURL: string; objectPath: string }> {
    const entityId = `uploads/${randomUUID()}`;
    const objectPath = `/objects/${entityId}`;
    const { bucketName, objectName } = parseObjectPath(
      `${this.getPrivateObjectDir().replace(/\/$/, "")}/${entityId}`,
    );
    if (useS3()) {
      const { client, bucket } = s3();
      const uploadURL = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: objectName }), {
        expiresIn: 900,
      });
      return { uploadURL, objectPath };
    }
    const uploadURL = await signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
    return { uploadURL, objectPath };
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObject> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const entityId = objectPath.slice("/objects/".length);
    if (!entityId || entityId.includes("..")) throw new ObjectNotFoundError();
    const privateDir = `${this.getPrivateObjectDir().replace(/\/$/, "")}/`;
    const { bucketName, objectName } = parseObjectPath(`${privateDir}${entityId}`);
    if (useS3()) {
      const object = await s3Object(objectName, false);
      if (!object) throw new ObjectNotFoundError();
      return object;
    }
    const file = (await gcs()).bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return gcsObject(file);
  }
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Failed to sign object URL: ${response.status}`);
  const data = (await response.json()) as { signed_url: string };
  return data.signed_url;
}
