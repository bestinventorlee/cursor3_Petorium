import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            name: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: "비디오를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/video/${params.id}`;

    // 공유 미리보기 카드 데이터
    const sharePreview = {
      url: shareUrl,
      title: video.title,
      description: video.description || `${video.user.username}의 비디오`,
      image: video.thumbnailUrl || video.user.avatar,
      siteName: "Petorium",
      type: "video.other",
      video: {
        url: video.videoUrl,
        type: "video/mp4",
        width: 1280,
        height: 720,
      },
    };

    return NextResponse.json({
      shareUrl,
      sharePreview,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        user: video.user,
        metrics: {
          likes: video._count.likes,
          comments: video._count.comments,
          views: video.views,
        },
      },
    });
  } catch (error) {
    console.error("Error generating share data:", error);
    return NextResponse.json(
      { error: "공유 데이터를 생성하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

