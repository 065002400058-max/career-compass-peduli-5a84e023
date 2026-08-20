import { useEffect } from "react";

/**
 * Menambahkan <meta name="robots" content="noindex, nofollow"> selama halaman
 * terproteksi/privat aktif, lalu membersihkannya saat halaman ditinggalkan.
 * Ini hanya pelengkap SEO — keamanan tetap berasal dari auth + RLS.
 */
export default function NoIndex() {
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex, nofollow";
    document.head.appendChild(tag);

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prev = canonical?.getAttribute("href") ?? null;
    canonical?.remove();

    return () => {
      tag.remove();
      if (canonical && prev) {
        const restored = document.createElement("link");
        restored.rel = "canonical";
        restored.href = prev;
        document.head.appendChild(restored);
      }
    };
  }, []);

  return null;
}
