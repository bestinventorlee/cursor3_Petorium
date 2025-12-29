import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecommendedVideos } from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "15"), 10),
      20
    ); // 10-20 사이로 제한

    const userId = session?.user?.id || null;

    const result = await getRecommendedVideos(userId, cursor, limit);

    // 응답 최적화: 필요한 데이터만 반환
    const optimizedVideos = result.videos.map((video: any) => ({
      id: video.id,
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      views: video.views,
      createdAt: video.createdAt,
      user: {
        id: video.user.id,
        username: video.user.username,
        avatar: video.user.avatar,
      },
      metrics: {
        likes: video._count.likes,
        comments: video._count.comments,
        views: video.views,
      },
      hashtags: video.hashtags.map((vh: any) => ({
        id: vh.hashtag.id,
        name: vh.hashtag.name,
      })),
    }));

    return NextResponse.json({
      videos: optimizedVideos,
      pagination: {
        cursor: result.nextCursor,
        hasMore: result.hasMore,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching recommended videos:", error);
    return NextResponse.json(
      { error: "추천 비디오를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

