import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { backend } from "@/lib/db";
import { LOCAL_DATA_DIR } from "@/lib/db/local-store";
import { supabaseAdmin } from "@/lib/db/supabase-store";

const BUCKET = "photos";
const UPLOAD_DIR = path.join(LOCAL_DATA_DIR, "uploads");
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function localPath(key: string) {
  const file = path.join(UPLOAD_DIR, key);
  if (!file.startsWith(UPLOAD_DIR + path.sep)) throw new Error("Invalid photo path");
  return file;
}

/** Stores a photo and returns its storage key (saved in photos.url). */
export async function savePhoto(visitId: string, photoId: string, data: Buffer, contentType: string): Promise<string> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `${visitId}/${photoId}.${ext}`;
  if (backend() === "supabase") {
    const { error } = await supabaseAdmin().storage.from(BUCKET).upload(key, data, { contentType, upsert: false });
    if (error) throw new Error(error.message);
  } else {
    const file = localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  return key;
}

export async function readPhoto(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  const contentType = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
  if (backend() === "supabase") {
    const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(key);
    if (error || !data) return null;
    return { data: Buffer.from(await data.arrayBuffer()), contentType };
  }
  try {
    return { data: await readFile(localPath(key)), contentType };
  } catch {
    return null;
  }
}

export async function deletePhoto(key: string) {
  if (backend() === "supabase") {
    await supabaseAdmin().storage.from(BUCKET).remove([key]);
  } else {
    await unlink(localPath(key)).catch(() => undefined);
  }
}
