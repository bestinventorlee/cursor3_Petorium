import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "10"), 20);

    // 1. 팔로우한 사용자들이 팔로우하는 사용자 (친구의 친구)
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    let suggestedUserIds: string[] = [];

    if (followingIds.length > 0) {
      const friendsOfFriends = await prisma.follow.findMany({
        where: {
          followerId: { in: followingIds },
          followingId: { not: userId },
        },
        select: { followingId: true },
        distinct: ["followingId"],
      });

      suggestedUserIds = friendsOfFriends
        .map((f) => f.followingId)
        .filter((id) => !followingIds.includes(id));
    }

    // 2. 인기 크리에이터 (팔로워가 많은 사용자)
    const popularUsers = await prisma.user.findMany({
      where: {
        id: {
          not: userId,
          notIn: [...followingIds, ...suggestedUserIds],
        },
        followers: { gt: 10 }, // 최소 10명의 팔로워
      },
      orderBy: { followers: "desc" },
      take: limit,
      select: {
        id: true,
        username: true,
        avatar: true,
        name: true,
        bio: true,
        followers: true,
        following: true,
        _count: {
          select: {
            videos: true,
          },
        },
      },
    });

    // 3. 최근 활동이 많은 크리에이터 (최근 비디오 업로드)
    const activeUsers = await prisma.user.findMany({
      where: {
        id: {
          not: userId,
          notIn: [...followingIds, ...suggestedUserIds, ...popularUsers.map((u) => u.id)],
        },
      },
      include: {
        _count: {
          select: {
            videos: true,
          },
        },
        videos: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        },
      },
      take: limit,
    });

    // 이미 팔로우 중인지 확인
    const allSuggestedIds = [
      ...suggestedUserIds,
      ...popularUsers.map((u) => u.id),
      ...activeUsers.map((u) => u.id),
    ];

    const existingFollows = await prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: allSuggestedIds },
      },
    });

    const followingSet = new Set(existingFollows.map((f) => f.followingId));

    // 제안 목록 구성
    const suggestions = [
      // 친구의 친구
      ...(await Promise.all(
        suggestedUserIds.slice(0, limit / 3).map(async (id) => {
          const user = await prisma.user.findUnique({
            where: { id },
            select: {
              id: true,
              username: true,
              avatar: true,
              name: true,
              bio: true,
              followers: true,
              following: true,
              _count: {
                select: {
                  videos: true,
                },
              },
            },
          });
          return user ? { ...user, isFollowing: followingSet.has(id) } : null;
        })
      )),
      // 인기 크리에이터
      ...popularUsers.map((user) => ({
        ...user,
        isFollowing: followingSet.has(user.id),
      })),
      // 활동적인 크리에이터
      ...activeUsers
        .filter((user) => {
          const lastVideo = user.videos[0];
          if (!lastVideo) return false;
          const daysSinceLastVideo =
            (Date.now() - lastVideo.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceLastVideo <= 7; // 최근 7일 내 업로드
        })
        .map((user) => ({
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          name: user.name,
          bio: user.bio,
          followers: user.followers,
          following: user.following,
          _count: user._count,
          isFollowing: followingSet.has(user.id),
        })),
    ]
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .slice(0, limit);

    return NextResponse.json({
      suggestions,
    });
  } catch (error: any) {
    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "팔로우 제안을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

