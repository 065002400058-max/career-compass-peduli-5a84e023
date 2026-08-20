// Base64 URL-safe encoding untuk ID yang tampil di URL (santri, alumni, pendidikan,
// hasil tes, percakapan, admin). Bersifat obfuscation ringan, bukan enkripsi.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const encodeId = (id: string): string => {
  if (!id) return "";
  try {
    return btoa(id).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return id;
  }
};

export const decodeId = (value?: string | null): string => {
  if (!value) return "";
  // Kompatibel ke belakang: URL lama yang masih memakai UUID mentah.
  if (UUID_RE.test(value)) return value;
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const decoded = atob(padded);
    return UUID_RE.test(decoded) || decoded.length > 0 ? decoded : value;
  } catch {
    return value;
  }
};
