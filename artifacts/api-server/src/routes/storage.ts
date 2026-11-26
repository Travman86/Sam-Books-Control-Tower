import { Readable } from "stream";
import { Router, type IRouter, type Request, type Response } from "express";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { isAuthenticated } from "./auth";
import { ObjectNotFoundError, ObjectStorageService, type StoredObject } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/csv": [".csv"],
  "text/plain": [".txt", ".text"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};
function validateFile(name: string, contentType: string, size: number): string | null {
  if (size > MAX_FILE_SIZE) return "Files must be 10 MiB or smaller.";
  const extensions = FILE_TYPES[contentType];
  if (!extensions) return "This file type is not supported.";
  const extension = name.toLowerCase().slice(name.lastIndexOf("."));
  if (!extensions.includes(extension)) return "The filename extension does not match its file type.";
  return null;
}

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid upload metadata." });
    return;
  }
  if (parsed.data.name.trim().length > 255) {
    res.status(400).json({ error: "Filename is too long." });
    return;
  }
  const validationError = validateFile(
    parsed.data.name.trim(),
    parsed.data.contentType.trim().toLowerCase(),
    parsed.data.size,
  );
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  try {
    const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUpload();
    res.json(RequestUploadUrlResponse.parse({
      uploadURL,
      objectPath,
      metadata: {
        name: parsed.data.name.trim(),
        size: parsed.data.size,
        contentType: parsed.data.contentType.trim().toLowerCase(),
      },
    }));
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

async function streamObject(
  req: Request,
  res: Response,
  getFile: () => Promise<StoredObject>,
  errorMessage: string,
) {
  try {
    const response = await objectStorageService.downloadObject(await getFile());
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    else res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}

router.get("/storage/public-objects/*filePath", async (req, res) => {
  const raw = req.params.filePath;
  const filePath = Array.isArray(raw) ? raw.join("/") : raw;
  await streamObject(req, res, async () => {
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) throw new ObjectNotFoundError();
    return file;
  }, "Failed to serve public object");
});

router.get("/storage/objects/*path", async (req, res) => {
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
  await streamObject(req, res, () => objectStorageService.getObjectEntityFile(`/objects/${wildcardPath}`), "Failed to serve object");
});

export default router;