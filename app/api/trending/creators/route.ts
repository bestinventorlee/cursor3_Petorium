import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const period = searchParams.get("period") || "7d"; // 7d, 30d

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get top creators by follower growth and recent activity
    const topCreators = await prisma.user.findMany({
      where: {
        followers: { gt: 0 },
        videos: {
          some: {
            createdAt: { gte: startDate },
          },
        },
      },
      include: {
        _count: {
          select: {
            videos: true,
            likes: true,
          },
        },
        videos: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            id: true,
            views: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { followers: "desc" },
      ],
      take: limit,
    });

    // Calculate growth metrics
    const creatorsWithMetrics = topCreators.map((creator) => {
      const recentVideos = creator.videos.length;
      const totalViews = creator.videos.reduce(
        (sum, v) => sum + v.views,
        0
      );
      const avgViews = recentVideos > 0 ? totalViews / recentVideos : 0;

      return {
        id: creator.id,
        username: creator.username,
        name: creator.name,
        avatar: creator.avatar,
        bio: creator.bio,
        followers: creator.followers,
        following: creator.following,
        _count: {
          videos: creator._count.videos,
          likes: creator._count.likes,
        },
        metrics: {
          recentVideos,
          totalViews,
          avgViews,
        },
      };
    });

    return NextResponse.json({
      creators: creatorsWithMetrics,
      period,
    });
  } catch (error) {
    console.error("Error fetching trending creators:", error);
    return NextResponse.json(
      { error: "트렌딩 크리에이터를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

