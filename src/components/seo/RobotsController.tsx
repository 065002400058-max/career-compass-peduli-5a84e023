import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PRIVATE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/profil",
  "/chat",
  "/auth",
  "/reset-password",
  "/cbt",
  "/psikotes",
  "/tracer",
  "/alumni",
];

const CANONICAL_ORIGIN = "https://career-compass-peduli.lovable.app";

/**
 * Mengatur meta robots + canonical berdasarkan rute:
 * - rute privat/terproteksi -> noindex, nofollow, tanpa canonical
 * - rute publik -> canonical ke domain production
 * Hanya untuk SEO; keamanan tetap dari authentication + RLS.
 */
export default function RobotsController() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPrivate = PRIVATE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = isPrivate ? "noindex, nofollow" : "index, follow";

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (isPrivate) {
      canonical?.remove();
    } else {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = `${CANONICAL_ORIGIN}${pathname === "/" ? "/" : pathname}`;
    }
  }, [pathname]);

  return null;
}
