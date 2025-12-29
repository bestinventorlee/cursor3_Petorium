import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "./lib/rate-limit";
import { validateCSRF } from "./lib/csrf";

// Rate limit configuration per route
const rateLimitConfigs: Record<string, { windowMs: number; maxRequests: number }> = {
  "/api/videos/upload": { windowMs: 60000, maxRequests: 5 }, // 5 uploads per minute
  "/api/auth/login": { windowMs: 60000, maxRequests: 5 }, // 5 login attempts per minute
  "/api/auth/register": { windowMs: 60000, maxRequests: 3 }, // 3 registrations per minute
  "/api/videos": { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
  "/api/search": { windowMs: 60000, maxRequests: 60 }, // 60 searches per minute
  default: { windowMs: 60000, maxRequests: 100 }, // Default rate limit
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting to API routes
  if (pathname.startsWith("/api/")) {
    const config = rateLimitConfigs[pathname] || rateLimitConfigs.default;
    const result = await rateLimit(request, {
      ...config,
      keyGenerator: (req) => {
        // Use IP address or user ID if authenticated
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "unknown";
        return `${pathname}:${ip}`;
      },
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.resetTime.toString(),
          },
        }
      );
    }

    // CSRF protection for state-changing methods
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      // Skip CSRF for certain routes (e.g., webhooks, public APIs, NextAuth, long-running uploads)
      const skipCSRF = [
        "/api/auth/callback",
        "/api/auth/[...nextauth]",
        "/api/webhooks",
        "/api/csrf-token", // CSRF token endpoint itself
        "/api/videos/upload", // 비디오 업로드는 처리 시간이 길어 CSRF 검증 건너뜀 (서버에서 인증 확인)
      ].some((route) => pathname.startsWith(route));

      // Skip CSRF in development for easier testing (remove in production)
      const isDevelopment = process.env.NODE_ENV === "development";

      if (!skipCSRF && !isDevelopment) {
        const isValid = await validateCSRF(request);
        if (!isValid) {
          return NextResponse.json(
            { error: "Invalid CSRF token" },
            { status: 403 }
          );
        }
      }
    }
  }

  // Security headers
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // CSP header (adjust as needed)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:;"
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    // Add other routes that need middleware
  ],
};

