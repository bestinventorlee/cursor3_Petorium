import { prisma } from "./prisma";
import {
  getCachedRecommendations,
  setCachedRecommendations,
  getCachedTrendingVideos,
} from "./recommendation-cache";

export interface VideoScore {
  videoId: string;
  score: number;
  reason: string;
}

/**
 * 추천 점수 계산
 */
export async function calculateVideoScores(
  userId: string | null,
  excludeVideoIds: string[] = []
): Promise<VideoScore[]> {
  const scores: Map<string, VideoScore> = new Map();
  const now = new Date();
  // 최근 7일로 확장하여 더 많은 비디오 포함
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. 트렌딩 비디오 (최근 7일 내 인기 비디오)
  // 캐시된 트렌딩 비디오 사용 (익명 사용자)
  let trendingVideos;
  if (!userId && excludeVideoIds.length === 0) {
    const cachedTrending = await getCachedTrendingVideos();
    const cachedIds = cachedTrending.map((v: any) => v.id);
    
    // 캐시된 트렌딩 비디오가 있을 때만 캐시 사용, 없으면 일반 쿼리 사용
    if (cachedIds.length > 0) {
      trendingVideos = await prisma.video.findMany({
        where: {
          id: { in: cachedIds },
          createdAt: { gte: last7Days },
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
          hashtags: {
            include: {
              hashtag: true,
            },
          },
        },
      });
    } else {
      // 캐시가 비어있으면 일반 쿼리 사용
      trendingVideos = await prisma.video.findMany({
        where: {
          createdAt: { gte: last7Days },
          id: { notIn: excludeVideoIds },
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
          hashtags: {
            include: {
              hashtag: true,
            },
          },
        },
        orderBy: [
          { views: "desc" },
          { createdAt: "desc" },
        ],
        take: 100, // 상위 100개만 고려
      });
    }
  } else {
    trendingVideos = await prisma.video.findMany({
      where: {
        createdAt: { gte: last7Days },
        id: { notIn: excludeVideoIds },
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
        hashtags: {
          include: {
            hashtag: true,
          },
        },
      },
      orderBy: [
        { views: "desc" },
        { createdAt: "desc" },
      ],
      take: 100, // 상위 100개만 고려
    });
  }

  for (const video of trendingVideos) {
    // 트렌딩 점수: (좋아요 * 2 + 댓글 * 1.5 + 조회수 * 0.1) / 시간 가중치
    const hoursSinceCreation =
      (now.getTime() - video.createdAt.getTime()) / (1000 * 60 * 60);
    const timeWeight = Math.max(1, hoursSinceCreation); // 시간이 지날수록 점수 감소
    const engagementScore =
      (video._count.likes * 2 +
        video._count.comments * 1.5 +
        video.views * 0.1) /
      timeWeight;
    
    // 최신 비디오 보너스 (24시간 이내)
    const recencyBonus = hoursSinceCreation < 24 ? 50 : hoursSinceCreation < 48 ? 25 : 0;

    scores.set(video.id, {
      videoId: video.id,
      score: engagementScore + recencyBonus,
      reason: recencyBonus > 0 ? "trending, recent" : "trending",
    });
  }

  if (userId) {
    // 2. 사용자 기반: 팔로우한 크리에이터의 비디오
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length > 0) {
      const followingVideos = await prisma.video.findMany({
        where: {
          userId: { in: followingIds },
          id: { notIn: excludeVideoIds },
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
          hashtags: {
            include: {
              hashtag: true,
            },
          },
        },
        take: 50,
      });

      for (const video of followingVideos) {
        const existing = scores.get(video.id);
        const followScore = 50; // 팔로우한 크리에이터 비디오에 높은 점수
        scores.set(video.id, {
          videoId: video.id,
          score: (existing?.score || 0) + followScore,
          reason: existing ? `${existing.reason}, following` : "following",
        });
      }
    }

    // 3. 콘텐츠 기반: 좋아요한 비디오와 유사한 해시태그
    const likedVideos = await prisma.like.findMany({
      where: { userId },
      include: {
        video: {
          include: {
            hashtags: {
              include: {
                hashtag: true,
              },
            },
          },
        },
      },
      take: 50, // 최근 좋아요한 비디오만 고려
      orderBy: { createdAt: "desc" },
    });

    if (likedVideos.length > 0) {
      // 좋아요한 비디오의 해시태그 수집
      const likedHashtagIds = new Set<string>();
      for (const like of likedVideos) {
        for (const videoHashtag of like.video.hashtags) {
          likedHashtagIds.add(videoHashtag.hashtagId);
        }
      }

      if (likedHashtagIds.size > 0) {
        // 유사한 해시태그를 가진 비디오 찾기
        const similarVideos = await prisma.video.findMany({
          where: {
            hashtags: {
              some: {
                hashtagId: { in: Array.from(likedHashtagIds) },
              },
            },
            id: { notIn: excludeVideoIds },
            userId: { not: userId }, // 자신의 비디오 제외
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
            hashtags: {
              include: {
                hashtag: true,
              },
            },
          },
          take: 50,
        });

        for (const video of similarVideos) {
          // 공통 해시태그 수 계산
          const videoHashtagIds = new Set(
            video.hashtags.map((vh) => vh.hashtagId)
          );
          const commonHashtags = Array.from(likedHashtagIds).filter((id) =>
            videoHashtagIds.has(id)
          ).length;

          const contentScore = commonHashtags * 20; // 공통 해시태그당 20점
          const existing = scores.get(video.id);
          scores.set(video.id, {
            videoId: video.id,
            score: (existing?.score || 0) + contentScore,
            reason: existing
              ? `${existing.reason}, similar-content`
              : "similar-content",
          });
        }
      }
    }

    // 4. 참여도 기반: 이미 본 비디오는 제외 (나중에 시청 기록 테이블 추가 가능)
    // 현재는 좋아요한 비디오 제외
    const likedVideoIds = likedVideos.map((l) => l.videoId);
    for (const videoId of likedVideoIds) {
      scores.delete(videoId);
    }
  }

  // 5. 다양성: 신규 크리에이터 콘텐츠에 보너스
  const allScoredVideoIds = Array.from(scores.keys());
  if (allScoredVideoIds.length > 0) {
    const videosWithUsers = await prisma.video.findMany({
      where: { id: { in: allScoredVideoIds } },
      include: {
        user: {
          select: {
            _count: {
              select: {
                videos: true,
              },
            },
          },
        },
      },
    });

    for (const video of videosWithUsers) {
      const existing = scores.get(video.id);
      if (existing) {
        // 비디오가 적은 크리에이터에게 보너스 (신규 크리에이터)
        const videoCount = video.user._count.videos;
        const diversityBonus = videoCount <= 5 ? 30 : videoCount <= 20 ? 15 : 0;
        scores.set(video.id, {
          ...existing,
          score: existing.score + diversityBonus,
          reason: diversityBonus > 0
            ? `${existing.reason}, new-creator`
            : existing.reason,
        });
      }
    }
  }

  // 점수로 정렬
  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}

/**
 * 비디오 추천 가져오기
 */
export async function getRecommendedVideos(
  userId: string | null,
  cursor: string | null,
  limit: number = 15
) {
  // 캐시 확인 (첫 페이지만 캐시)
  if (!cursor) {
    const cached = getCachedRecommendations(userId, null);
    if (cached) {
      return cached;
    }
  }

  const excludeVideoIds: string[] = [];

  // 커서가 있으면 이미 본 비디오 제외
  if (cursor) {
    try {
      const cursorData = JSON.parse(
        Buffer.from(cursor, "base64").toString()
      );
      excludeVideoIds.push(...(cursorData.excludeIds || []));
    } catch {
      // 커서 파싱 실패 시 무시
    }
  }

  // 추천 점수 계산
  const scoredVideos = await calculateVideoScores(userId, excludeVideoIds);

  // 점수가 없는 최신 비디오도 포함 (최근 24시간 내)
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentVideos = await prisma.video.findMany({
    where: {
      createdAt: { gte: last24Hours },
      id: { notIn: excludeVideoIds },
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
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const recentVideoIds = recentVideos.map((v) => v.id);
  const scoredVideoIds = new Set(scoredVideos.map((v) => v.videoId));
  
  // 점수가 없는 최신 비디오에 기본 점수 부여
  for (const videoId of recentVideoIds) {
    if (!scoredVideoIds.has(videoId)) {
      scoredVideos.push({
        videoId,
        score: 30, // 기본 점수
        reason: "recent",
      });
    }
  }

  // 점수로 정렬
  scoredVideos.sort((a, b) => b.score - a.score);

  // 상위 N개 선택
  const topVideos = scoredVideos.slice(0, limit * 2); // 다양성을 위해 더 많이 가져옴
  const selectedVideoIds = topVideos.map((v) => v.videoId);

  // 비디오 데이터 가져오기
  const videos = await prisma.video.findMany({
    where: { 
      id: { in: selectedVideoIds },
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
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
      hashtags: {
        include: {
          hashtag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    take: limit,
  });

  // 점수 순서대로 정렬
  const videoMap = new Map(videos.map((v) => [v.id, v]));
  const sortedVideos = selectedVideoIds
    .map((id) => videoMap.get(id))
    .filter((v): v is NonNullable<typeof v> => v !== undefined)
    .slice(0, limit);

  // 다음 커서 생성
  const nextCursor =
    scoredVideos.length > limit
      ? Buffer.from(
          JSON.stringify({
            excludeIds: [
              ...excludeVideoIds,
              ...sortedVideos.map((v) => v.id),
            ],
            lastScore: scoredVideos[limit - 1]?.score || 0,
          })
        ).toString("base64")
      : null;

  const result = {
    videos: sortedVideos,
    nextCursor,
    hasMore: scoredVideos.length > limit,
  };

  // 첫 페이지 캐시
  if (!cursor) {
    setCachedRecommendations(userId, null, result);
  }

  return result;
}

