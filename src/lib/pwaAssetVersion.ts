/**
 * Bump this when favicons / PWA home-screen icons change so browsers refetch
 * the manifest and icon URLs instead of serving stale cached assets.
 * Also update `public/site.webmanifest` and `public/admin.webmanifest` icon `src` query to match (same `v=`).
 */
export const PWA_ASSET_VERSION = "2";

export function withPwaCacheBust(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${PWA_ASSET_VERSION}`;
}
