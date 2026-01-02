import { prisma } from "./prisma";

// 간단한 인메모리 캐시 (프로덕션에서는 Redis 사용 권장)
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

export function getCachedRecommendations(userId: string | null, cursor: string | null): any | null {
  const key = `recommendations:${userId || "anonymous"}:${cursor || "first"}`;
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  if (cached) {
    cache.delete(key);
  }

  return null;
}

export function setCachedRecommendations(
  userId: string | null,
  cursor: string | null,
  data: any
) {
  const key = `recommendations:${userId || "anonymous"}:${cursor || "first"}`;
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });

  // 캐시 크기 제한 (최대 100개)
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }
}

/**
 * 트렌딩 비디오 캐시 (익명 사용자용)
 */
export async function getCachedTrendingVideos() {
  const key = "trending:videos";
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 트렌딩 비디오 계산
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const trendingVideos = await prisma.video.findMany({
    where: {
      createdAt: { gte: last24Hours },
      isRemoved: false,
      isFlagged: false,
      // 처리 중이거나 오류 상태인 비디오 제외
      AND: [
        {
          videoUrl: {
            not: {
              startsWith: "processing://",
            },
          },
        },
        {
          videoUrl: {
            not: {
              startsWith: "error://",
            },
          },
        },
      ],
    },
    include: {
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
    orderBy: [
      { views: "desc" },
      { createdAt: "desc" },
    ],
    take: 50,
  });

  const data = trendingVideos.map((v) => ({
    id: v.id,
    score: v._count.likes * 2 + v._count.comments * 1.5 + v.views * 0.1,
  }));

  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return data;
}

