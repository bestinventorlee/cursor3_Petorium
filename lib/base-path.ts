const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

export const BASE_PATH =
  configuredBasePath ??
  (process.env.NODE_ENV === "production" ? "/petorium" : "");

export function withBasePath(path: string): string {
  if (!path) return BASE_PATH || "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalizedPath}`;
}
