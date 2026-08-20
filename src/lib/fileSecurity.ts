// Validasi unggahan file: MIME allowlist + pemeriksaan magic bytes (isi file),
// bukan hanya ekstensi. Nama file selalu UUID.

export const IMAGE_MIME_ALLOWLIST = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) =>
  sig.every((b, i) => bytes[offset + i] === b);

/** Deteksi tipe gambar dari isi file (magic bytes). */
export async function sniffImageMime(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(head, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}

export type ImageCheck =
  | { ok: true; mime: string; ext: string }
  | { ok: false; error: string };

/** Validasi ukuran, MIME yang dilaporkan, dan isi file. */
export async function validateImageUpload(file: File, maxBytes = 2 * 1024 * 1024): Promise<ImageCheck> {
  if (file.size === 0) return { ok: false, error: "File kosong" };
  if (file.size > maxBytes)
    return { ok: false, error: `Ukuran file maksimal ${Math.round(maxBytes / 1024 / 1024)}MB` };

  const sniffed = await sniffImageMime(file);
  if (!sniffed)
    return { ok: false, error: "Format tidak didukung. Gunakan PNG, JPG, atau WEBP." };
  if (!IMAGE_MIME_ALLOWLIST.includes(sniffed as (typeof IMAGE_MIME_ALLOWLIST)[number]))
    return { ok: false, error: "Format file tidak diizinkan" };
  if (file.type && file.type !== sniffed && !(sniffed === "image/jpeg" && file.type === "image/jpg"))
    return { ok: false, error: "Isi file tidak sesuai dengan tipe file" };

  return { ok: true, mime: sniffed, ext: EXT_BY_MIME[sniffed] };
}

/** Nama file acak (UUID) di dalam folder milik pengguna. */
export function ownedStoragePath(userId: string, ext: string) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${userId}/${id}.${ext}`;
}
