import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const period = searchParams.get("period") || "24h"; // 24h, 7d, 30d

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get viral videos based on engagement rate
    // Engagement rate = (likes + comments * 2) / views
    const viralVideos = await prisma.video.findMany({
      where: {
        createdAt: { gte: startDate },
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
      },
      take: limit * 2, // Get more to calculate engagement rate
    });

    // Calculate engagement rate and sort
    const videosWithEngagement = viralVideos
      .map((video) => {
        const likes = video._count.likes;
        const comments = video._count.comments;
        const views = video.views || 1; // Avoid division by zero
        const engagementRate =
          views > 0 ? (likes + comments * 2) / views : 0;

        return {
          ...video,
          engagementRate,
        };
      })
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, limit);

    return NextResponse.json({
      videos: videosWithEngagement,
      period,
    });
  } catch (error) {
    console.error("Error fetching trending videos:", error);
    return NextResponse.json(
      { error: "트렌딩 비디오를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

