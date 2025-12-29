/**
 * CDN Configuration and Utilities
 * Supports CloudFlare R2 and AWS CloudFront
 */

const CDN_BASE_URL = process.env.CDN_BASE_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || "";
const USE_CDN = process.env.USE_CDN === "true";

export function getVideoUrl(videoPath: string): string {
  if (!USE_CDN || !CDN_BASE_URL) {
    return videoPath;
  }
  
  // Remove leading slash if present
  const cleanPath = videoPath.startsWith("/") ? videoPath.slice(1) : videoPath;
  return `${CDN_BASE_URL}/${cleanPath}`;
}

export function getThumbnailUrl(thumbnailPath: string): string {
  return getVideoUrl(thumbnailPath);
}

/**
 * Generate CDN URL with query parameters for optimization
 */
export function getOptimizedUrl(
  path: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "avif" | "jpg" | "png";
  }
): string {
  const baseUrl = getVideoUrl(path);
  
  if (!options || !USE_CDN) {
    return baseUrl;
  }

  const params = new URLSearchParams();
  if (options.width) params.set("w", options.width.toString());
  if (options.height) params.set("h", options.height.toString());
  if (options.quality) params.set("q", options.quality.toString());
  if (options.format) params.set("f", options.format);

  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

/**
 * Check if CDN is enabled
 */
export function isCDNEnabled(): boolean {
  return USE_CDN && !!CDN_BASE_URL;
}

