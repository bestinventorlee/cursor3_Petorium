/**
 * Redis Cache Configuration
 * For caching hot data and improving performance
 */

import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  // Edge Runtime에서는 Redis를 사용할 수 없음
  if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge") {
    return null;
  }

  if (!process.env.REDIS_URL) {
    // Redis URL이 없으면 조용히 null 반환 (경고 제거)
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    // URL 파싱 오류 방지를 위해 문자열로 직접 전달
    const redisUrl = process.env.REDIS_URL;
    
    // URL 형식 검증
    if (!redisUrl || (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://"))) {
      // Redis URL이 없거나 형식이 잘못되었으면 조용히 null 반환
      return null;
    }

    // redis 패키지의 URL 파싱 문제를 피하기 위해 직접 옵션 객체 사용
    try {
      // URL을 파싱하여 호스트, 포트 등을 추출
      const urlObj = new URL(redisUrl);
      redisClient = createClient({
        socket: {
          host: urlObj.hostname,
          port: parseInt(urlObj.port || "6379"),
          tls: urlObj.protocol === "rediss:",
        },
        password: urlObj.password || undefined,
      }) as RedisClientType;
    } catch (urlError) {
      // URL 파싱 실패 시 기본 방식 시도
      redisClient = createClient({
        url: redisUrl,
      }) as RedisClientType;
    }

    redisClient.on("error", (err) => {
      // Edge Runtime 오류는 조용히 무시
      if (err.message && err.message.includes("edge runtime")) {
        redisClient = null;
        return;
      }
      // 다른 오류는 개발 환경에서만 로그
      if (process.env.NODE_ENV === "development") {
        console.error("Redis Client Error:", err);
      }
      redisClient = null; // 오류 발생 시 클라이언트 초기화
    });

    await redisClient.connect();
    return redisClient;
  } catch (error: any) {
    // Edge Runtime 오류는 조용히 무시
    if (error?.message && error.message.includes("edge runtime")) {
      redisClient = null;
      return null;
    }
    // Redis 연결 실패는 치명적이지 않으므로 조용히 처리
    // 개발 환경에서만 로그 출력
    if (process.env.NODE_ENV === "development") {
      console.warn("Redis connection failed, caching disabled:", error?.message || error);
    }
    redisClient = null;
    return null;
  }
}

/**
 * Cache with TTL
 */
export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 3600
): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    const serialized = JSON.stringify(value);
    await client.setEx(key, ttlSeconds, serialized);
    return true;
  } catch (error) {
    console.error("Redis cache set error:", error);
    return false;
  }
}

/**
 * Get from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Redis cache get error:", error);
    return null;
  }
}

/**
 * Delete from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error("Redis cache delete error:", error);
    return false;
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  video: (id: string) => `video:${id}`,
  user: (id: string) => `user:${id}`,
  userVideos: (userId: string, page: number) => `user:videos:${userId}:${page}`,
  trendingHashtags: (period: string) => `trending:hashtags:${period}`,
  trendingVideos: (period: string) => `trending:videos:${period}`,
  search: (query: string, type: string, page: number) =>
    `search:${type}:${query}:${page}`,
};

