/**
 * API Client with automatic CSRF token handling
 */

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Get CSRF token (with caching)
 */
async function getCSRFToken(): Promise<string | null> {
  // Return cached token if available
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  // If a request is already in progress, wait for it
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Fetch new token
  csrfTokenPromise = (async () => {
    try {
      const response = await fetch("/api/csrf-token", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        csrfTokenCache = data.token;
        return data.token;
      }
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
    }
    return null;
  })();

  const token = await csrfTokenPromise;
  csrfTokenPromise = null;
  return token;
}

/**
 * Clear CSRF token cache (call after logout or token expiration)
 */
export function clearCSRFToken() {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

/**
 * Fetch wrapper with automatic CSRF token inclusion
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || "GET";
  const needsCSRF = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers = new Headers(options.headers);

  // Add CSRF token for state-changing methods
  if (needsCSRF) {
    const token = await getCSRFToken();
    if (token) {
      headers.set("X-CSRF-Token", token);
    }
  }

  // Ensure Content-Type is set for JSON requests
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Convenience methods
 */
export const api = {
  get: (url: string, options?: RequestInit) =>
    apiFetch(url, { ...options, method: "GET" }),
  post: (url: string, body?: any, options?: RequestInit) =>
    apiFetch(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (url: string, body?: any, options?: RequestInit) =>
    apiFetch(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: (url: string, body?: any, options?: RequestInit) =>
    apiFetch(url, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (url: string, options?: RequestInit) =>
    apiFetch(url, { ...options, method: "DELETE" }),
};

