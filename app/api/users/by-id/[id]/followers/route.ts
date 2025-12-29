import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;

    const followers = await prisma.follow.findMany({
      where: { followingId: params.id },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        follower: {
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
        },
      },
    });

    const total = await prisma.follow.count({
      where: { followingId: params.id },
    });

    // 현재 사용자가 각 팔로워를 팔로우하고 있는지 확인
    const followerIds = followers.map((f) => f.followerId);
    let followingMap = new Map<string, boolean>();

    if (session?.user && followerIds.length > 0) {
      const userFollows = await prisma.follow.findMany({
        where: {
          followerId: session.user.id,
          followingId: { in: followerIds },
        },
      });

      followingMap = new Map(
        userFollows.map((f) => [f.followingId, true])
      );
    }

    const followersWithStatus = followers.map((f) => ({
      ...f.follower,
      isFollowing: session?.user ? followingMap.get(f.followerId) || false : false,
    }));

    return NextResponse.json({
      followers: followersWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching followers:", error);
    return NextResponse.json(
      { error: "팔로워 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

