import type { SupabaseClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";

export const CHAT_IMAGES_BUCKET = "chat-images";

export function chatImageSignedUrlExpirySeconds(): number {
  return 86_400;
}

export function parseImageIdCsv(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) {
      if (item == null) continue;
      if (typeof item === "string") {
        out.push(...parseImageIdCsv(item));
      } else if (typeof item === "number" || typeof item === "boolean") {
        const s = String(item).trim();
        if (s) out.push(s);
      }
    }
    return out.filter(Boolean);
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinImageIdCsv(filenames: string[]): string {
  return filenames.filter(Boolean).join(",");
}

export function buildChatImageStoragePath(userId: string, filename: string): string {
  return `${userId}/${filename}`;
}

/**
 * Normalizes `expo-image-picker` `base64` payloads: trims and strips an optional
 * `data:<mime>;base64,` prefix so `decode` from `base64-arraybuffer` receives raw base64 only.
 */
export function normalizePickerBase64(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dataUrl = trimmed.match(/^data:[^;]+;base64,(.+)$/i);
  if (dataUrl?.[1]) {
    const inner = dataUrl[1].trim();
    return inner.length > 0 ? inner : null;
  }
  return trimmed;
}

function extensionFromMime(mime: string | undefined): string {
  if (!mime) return "jpg";
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/gif": "gif",
  };
  return map[mime.toLowerCase()] ?? "jpg";
}

export type LocalImagePick = {
  uri: string;
  /** Base64 from `expo-image-picker` with `base64: true` (with or without `data:...;base64,` prefix). */
  base64: string;
  mimeType?: string | null;
};

/**
 * Upload picked images to `chat-images` at `{userId}/{uuid}.{ext}`. Returns storage filenames (second path segment only) for `messages.image_id` CSV.
 */
export async function uploadChatImages(
  client: SupabaseClient,
  userId: string,
  picks: LocalImagePick[],
  genUuid: () => string
): Promise<{ filenames: string[]; error?: string }> {
  const filenames: string[] = [];

  for (const pick of picks) {
    const ext = extensionFromMime(pick.mimeType ?? undefined);
    const filename = `${genUuid()}.${ext}`;
    const path = buildChatImageStoragePath(userId, filename);

    const payload = normalizePickerBase64(pick.base64);
    if (!payload) {
      return { filenames: [], error: "Missing image data for one or more items." };
    }

    let bytes: ArrayBuffer;
    try {
      bytes = decode(payload);
    } catch {
      return { filenames: [], error: "Invalid image data." };
    }
    if (!bytes.byteLength) {
      return { filenames: [], error: "Empty image data." };
    }

    const contentType = pick.mimeType?.trim() || "image/jpeg";

    const { error } = await client.storage.from(CHAT_IMAGES_BUCKET).upload(path, bytes, {
      cacheControl: "3600",
      upsert: false,
      contentType: contentType || "image/jpeg",
    });

    if (error) {
      return { filenames: [], error: error.message };
    }
    filenames.push(filename);
  }

  return { filenames };
}

export async function createSignedUrlsForChatImages(
  client: SupabaseClient,
  userId: string,
  filenames: string[],
  expiresSeconds?: number
): Promise<{ urls: string[]; error?: string }> {
  if (filenames.length === 0) return { urls: [] };

  const paths = filenames.map((f) => buildChatImageStoragePath(userId, f));
  const exp = expiresSeconds ?? chatImageSignedUrlExpirySeconds();

  const { data, error } = await client.storage.from(CHAT_IMAGES_BUCKET).createSignedUrls(paths, exp);

  if (error) {
    return { urls: [], error: error.message };
  }

  const urls =
    data?.map((row) => row.signedUrl).filter((u): u is string => typeof u === "string" && u.length > 0) ??
    [];

  if (urls.length !== filenames.length) {
    return { urls: [], error: "Signed URL count mismatch" };
  }

  return { urls };
}
