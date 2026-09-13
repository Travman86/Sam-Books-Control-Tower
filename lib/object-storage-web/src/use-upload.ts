import { useCallback, useState } from "react";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

export interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: UploadMetadata;
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    try {
      const response = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Failed to get upload URL");
      setProgress(10);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", body.uploadURL);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(10 + Math.round((event.loaded / event.total) * 90));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error("Failed to upload file to storage"));
        xhr.onerror = () => reject(new Error("Failed to upload file to storage"));
        xhr.send(file);
      });
      setProgress(100);
      return body as UploadResponse;
    } catch (cause) {
      const uploadError = cause instanceof Error ? cause : new Error("Upload failed");
      setError(uploadError);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadFile, isUploading, progress, error };
}
