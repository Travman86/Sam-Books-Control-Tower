// Copy every object from the Replit object-storage bucket to Cloudflare R2,
// key-for-key, so object paths already stored in the database stay valid.
//
// Runs ONLY inside a Replit Shell: the source bucket is reachable only through
// Replit's local storage sidecar. Reads from Replit, never writes or deletes
// there. Safe to re-run: objects already in R2 with the same size are skipped.
//
// Usage (Replit Shell):
//   mkdir -p /tmp/r2copy && cd /tmp/r2copy && npm init -y >/dev/null \
//     && npm i --silent @google-cloud/storage @aws-sdk/client-s3
//   S3_ENDPOINT=... S3_BUCKET=sam-books-control-tower S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
//     [DRY_RUN=1] [PREFIX=.private/] node copy-replit-bucket-to-r2.mjs
//
// The source bucket comes from PRIVATE_OBJECT_DIR (already set in Replit).
import { Storage } from "@google-cloud/storage";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const need = (name) => {
  const value = process.env[name]?.trim();
  if (!value) { console.error(`Missing ${name}`); process.exit(1); }
  return value;
};

const privateDir = need("PRIVATE_OBJECT_DIR");
const sourceBucket = privateDir.replace(/^\/+/, "").split("/")[0];
const prefix = process.env.PREFIX ?? "";
const dryRun = process.env.DRY_RUN === "1";
const concurrency = Number(process.env.CONCURRENCY ?? 8);

const SIDECAR = "http://127.0.0.1:1106";
const gcs = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: { url: `${SIDECAR}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const r2Bucket = need("S3_BUCKET");
const r2 = new S3Client({
  region: process.env.S3_REGION?.trim() || "auto",
  endpoint: need("S3_ENDPOINT"),
  forcePathStyle: true,
  credentials: { accessKeyId: need("S3_ACCESS_KEY_ID"), secretAccessKey: need("S3_SECRET_ACCESS_KEY") },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function r2Size(key) {
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch (error) {
    if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

console.log(`Source: gs://${sourceBucket}/${prefix}  ->  R2: ${r2Bucket}/${prefix}${dryRun ? "  (DRY RUN)" : ""}`);
const [files] = await gcs.bucket(sourceBucket).getFiles({ prefix });
const objects = files.filter((f) => !f.name.endsWith("/"));
const totalBytes = objects.reduce((sum, f) => sum + Number(f.metadata.size ?? 0), 0);
console.log(`Found ${objects.length} objects (${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);

const stats = { copied: 0, skipped: 0, failed: 0, bytes: 0 };
const failures = [];
let next = 0;

async function worker() {
  while (next < objects.length) {
    const file = objects[next++];
    const key = file.name;
    const size = Number(file.metadata.size ?? 0);
    try {
      if ((await r2Size(key)) === size) { stats.skipped++; continue; }
      if (!dryRun) {
        const [body] = await file.download();
        await r2.send(new PutObjectCommand({
          Bucket: r2Bucket, Key: key, Body: body,
          ContentType: file.metadata.contentType || "application/octet-stream",
        }));
        if ((await r2Size(key)) !== size) throw new Error("size mismatch after upload");
      }
      stats.copied++;
      stats.bytes += size;
    } catch (error) {
      stats.failed++;
      failures.push(`${key}: ${error?.message ?? error}`);
    }
    const done = stats.copied + stats.skipped + stats.failed;
    if (done % 25 === 0 || done === objects.length) {
      console.log(`  ${done}/${objects.length}  copied=${stats.copied} skipped=${stats.skipped} failed=${stats.failed}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

console.log(`\nDone${dryRun ? " (dry run — nothing written)" : ""}: ${stats.copied} ${dryRun ? "would copy" : "copied"} ` +
  `(${(stats.bytes / 1024 / 1024).toFixed(1)} MB), ${stats.skipped} already in R2, ${stats.failed} failed.`);
if (failures.length) {
  console.log("Failures:");
  for (const line of failures.slice(0, 50)) console.log(`  ${line}`);
  process.exitCode = 1;
}
