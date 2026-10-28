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

/** GIF and animated WebP must skip canvas compression or the animation dies. */
export async function isAnimated(file: File): Promise<boolean> {
  if (file.type === "image/gif") return true;
  if (file.type !== "image/webp") return false;
  try {
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    return new TextDecoder("ascii").decode(head).includes("ANIM");
  } catch {
    return false;
  }
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

async function compress(file: File, maxMb: number, maxEdge: number) {
  return imageCompression(file, {
    maxSizeMB: maxMb,
    maxWidthOrHeight: maxEdge,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.88,
  });
}

export async function uploadAttachment(
  userId: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<UploadResult> {
  const supabase = requireSupabase();

  let blob: Blob = file;
  let mime = file.type || "application/octet-stream";

  if (isImage(file.type) && !(await isAnimated(file))) {
    const compressed = await compress(file, 1.6, 1600);
    blob = compressed;
    mime = compressed.type || "image/webp";
    onProgress?.(1);
  }

  if (blob.size > MAX_BYTES) throw new Error("file-too-large");

  const { width, height } = await measure(blob);
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(mime)}`;

  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, blob, { contentType: mime, upsert: false });

  if (error) throw error;

  return { path, mime, width, height, size: blob.size };
}

async function uploadImage(
  bucket: "avatars" | "banners",
  userId: string,
  file: File,
  maxMb: number,
  maxEdge: number,
) {
  const supabase = requireSupabase();
  const animated = await isAnimated(file);
  const blob = animated ? file : await compress(file, maxMb, maxEdge);
  const mime = animated ? file.type : "image/webp";
  const extension = extensionFor(mime);
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: mime, upsert: false });

  if (error) throw error;
  return { path, animated };
}

export async function uploadAvatar(userId: string, file: File) {
  const result = await uploadImage("avatars", userId, file, 1.8, 512);
  return result;
}

export async function uploadBanner(userId: string, file: File) {
  const result = await uploadImage("banners", userId, file, 2.4, 1600);
  return result;
}

export async function uploadServerIcon(userId: string, serverId: string, file: File) {
  const supabase = requireSupabase();
  const animated = await isAnimated(file);
  const blob = animated ? file : await compress(file, 1.4, 512);
  const mime = animated ? file.type : "image/webp";
  const path = `${userId}/server-${serverId}-${crypto.randomUUID()}.${extensionFor(mime)}`;

  const { error } = await supabase.storage
    .from("banners")
    .upload(path, blob, { contentType: mime, upsert: false });

  if (error) throw error;
  return path;
}