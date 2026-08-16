// Lovable CDN assets are served from a path that only exists on Lovable hosting.
// When the app runs on another host (e.g. Vercel), rewrite to the absolute CDN origin
// so institutional logos keep loading everywhere.
const LOVABLE_ORIGIN = "https://career-compass-peduli.lovable.app";

export const assetUrl = (url: string): string => {
  if (!url.startsWith("/__l5e/")) return url;
  if (typeof window === "undefined") return url;
  const host = window.location.hostname;
  const isLovableHost =
    host.includes("lovable") || host === "localhost" || host === "127.0.0.1";
  return isLovableHost ? url : `${LOVABLE_ORIGIN}${url}`;
};
