/**
 * Rate Limiting Middleware
 * Using in-memory store (for production, use Redis)
 */

import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet } from "./redis";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string;
}

const defaultKeyGenerator = (request: NextRequest): string => {
  // Use IP address as default key
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";
  return `ratelimit:${ip}`;
};

// In-memory store (fallback if Redis is not available)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limit middleware
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
  } = config;

  const key = keyGenerator(request);
  const now = Date.now();
  const resetTime = now + windowMs;

  // Edge Runtime에서는 메모리 스토어만 사용
  const isEdgeRuntime = typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge";
  
  // Try Redis first (Node.js runtime only)
  let cached: { count: number; resetTime: number } | null = null;
  if (!isEdgeRuntime) {
    const redisKey = `ratelimit:${key}`;
    cached = await cacheGet<{ count: number; resetTime: number }>(redisKey);
  }

  if (cached) {
    if (cached.resetTime > now) {
      // Within window
      if (cached.count >= maxRequests) {
        return {
          success: false,
          remaining: 0,
          resetTime: cached.resetTime,
        };
      }
      // Increment count
      const newCount = cached.count + 1;
      if (!isEdgeRuntime) {
        const redisKey = `ratelimit:${key}`;
        await cacheSet(redisKey, { count: newCount, resetTime: cached.resetTime }, Math.ceil((cached.resetTime - now) / 1000));
      } else {
        // Edge Runtime: 메모리 스토어 사용
        memoryStore.set(key, { count: newCount, resetTime: cached.resetTime });
      }
      return {
        success: true,
        remaining: maxRequests - newCount,
        resetTime: cached.resetTime,
      };
    }
  }

  // 메모리 스토어 확인 (Edge Runtime 또는 Redis 실패 시)
  const memoryEntry = memoryStore.get(key);
  if (memoryEntry && memoryEntry.resetTime > now) {
    if (memoryEntry.count >= maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: memoryEntry.resetTime,
      };
    }
    const newCount = memoryEntry.count + 1;
    memoryStore.set(key, { count: newCount, resetTime: memoryEntry.resetTime });
    return {
      success: true,
      remaining: maxRequests - newCount,
      resetTime: memoryEntry.resetTime,
    };
  }

  // New window or expired
  if (!isEdgeRuntime) {
    const redisKey = `ratelimit:${key}`;
    await cacheSet(redisKey, { count: 1, resetTime }, Math.ceil(windowMs / 1000));
  }
  memoryStore.set(key, { count: 1, resetTime });
  return {
    success: true,
    remaining: maxRequests - 1,
    resetTime,
  };
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    const result = await rateLimit(request, config);
    
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

    return null; // Continue to next middleware
  };
}

