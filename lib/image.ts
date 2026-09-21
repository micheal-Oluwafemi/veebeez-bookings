/**
 * Image URL helper for Contabo S3 (eu2.contabostorage.com)
 * The API returns presigned URLs like:
 * https://eu2.contabostorage.com/veebeez/.../xxx.webp?X-Amz-Content-Sha256=...&X-Amz-Signature=...&X-Amz-Expires=3600
 * These expire in 3600s and are private — bucket requires signature, so stripping
 * immediately causes 401 until bucket is made public or a CDN is configured.
 *
 * Strategy (revised after 401 debug):
 * 1. If NEXT_PUBLIC_CDN_URL is set (e.g. https://cdn.thevaleriebrand.co), strip X-Amz-* and rewrite to CDN (edge cache).
 * 2. Otherwise return the *original signed URL as-is* so images actually render (200). This keeps the hourly expiry
 *    but avoids 401. Mark those images as `unoptimized` in next/image so the Next server does NOT try to fetch upstream
 *    via /_next/image (which would also 401 if we stripped). Browser fetches directly with valid signature.
 * 3. Non-Contabo URLs pass through unchanged and can be optimized normally.
 */
const CONTABO_HOST = "contabostorage.com";
const CDN_BASE = (process.env.NEXT_PUBLIC_CDN_URL ?? "").replace(/\/$/, "");

export function getOptimizedImageUrl(rawUrl: string | null | undefined, fallback = "/imgs/image-4.webp"): string {
  if (!rawUrl) return fallback;
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.includes(CONTABO_HOST)) return rawUrl;

    // CDN mode: strip signature and rewrite to CDN origin
    if (CDN_BASE && url.hostname.endsWith("contabostorage.com")) {
      const paramsToDelete: string[] = [];
      url.searchParams.forEach((_, key) => {
        if (key.startsWith("X-Amz-")) paramsToDelete.push(key);
      });
      paramsToDelete.forEach((k) => url.searchParams.delete(k));
      const cdnUrl = new URL(CDN_BASE);
      const clean = `${cdnUrl.origin}${url.pathname}${url.search}`;
      return clean.endsWith("?") ? clean.slice(0, -1) : clean;
    }

    // No CDN configured → bucket is still private, preserve the signed URL so it returns 200
    // Do NOT strip X-Amz-* here; otherwise upstream returns 401
    return rawUrl;
  } catch {
    return rawUrl || fallback;
  }
}

export function shouldUnoptimize(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.includes(CONTABO_HOST) && !CDN_BASE;
  } catch {
    return false;
  }
}

/**
 * For next/image loader — append width & quality for CDN optimization if supported
 */
export function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const clean = getOptimizedImageUrl(src);
  if (clean.includes("contabostorage.com") && CDN_BASE) {
    const q = quality ?? 75;
    return `${clean}${clean.includes("?") ? "&" : "?"}width=${width}&quality=${q}`;
  }
  return clean;
}
