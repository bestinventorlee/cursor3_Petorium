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

    // Get trending hashtags based on recent video usage
    const trendingHashtags = await prisma.$queryRaw<any[]>`
      SELECT 
        h.id,
        h.name,
        h."videoCount",
        COUNT(vh.id) as recent_videos,
        COUNT(DISTINCT v."userId") as unique_creators
      FROM hashtags h
      INNER JOIN "video_hashtags" vh ON h.id = vh."hashtagId"
      INNER JOIN videos v ON vh."videoId" = v.id
      WHERE v."createdAt" >= ${startDate}
      GROUP BY h.id, h.name, h."videoCount"
      ORDER BY recent_videos DESC, h."videoCount" DESC
      LIMIT ${limit}
    `;

    // Format results
    const formattedHashtags = trendingHashtags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      videoCount: Number(tag.videoCount),
      recentVideos: Number(tag.recent_videos),
      uniqueCreators: Number(tag.unique_creators),
    }));

    return NextResponse.json({
      hashtags: formattedHashtags,
      period,
    });
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
    return NextResponse.json(
      { error: "트렌딩 해시태그를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

