import imageCompression from "browser-image-compression";

import { requireSupabase } from "@/lib/supabase";

export interface UploadResult {
  path: string;
  mime: string;
  width: number | null;
  height: number | null;
  size: number;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export function isImage(mime: string) {
  return IMAGE_TYPES.includes(mime);
}

function extensionFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function measure(blob: Blob) {
  if (!isImage(blob.type)) return { width: null, height: null };
  const bitmap = await createImageBitmap(blob).catch(() => null);
  if (!bitmap) return { width: null, height: null };
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export async function uploadAttachment(
  userId: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<UploadResult> {
  const supabase = requireSupabase();

  let blob: Blob = file;
  let mime = file.type || "application/octet-stream";

  if (isImage(file.type)) {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.6,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.85,
      onProgress,
    });
    blob = compressed;
    mime = compressed.type || "image/webp";
  }

  if (blob.size > MAX_BYTES) {
    throw new Error("file-too-large");
  }

  const { width, height } = await measure(blob);
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(mime)}`;

  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, blob, { contentType: mime, upsert: false });

  if (error) throw error;

  return { path, mime, width, height, size: blob.size };
}

export async function uploadAvatar(userId: string, file: File) {
  const supabase = requireSupabase();
  const blob = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 512,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.9,
  });
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) throw error;
  return path;
}
