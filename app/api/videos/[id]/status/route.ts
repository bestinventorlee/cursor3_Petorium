import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        videoUrl: true,
        thumbnailUrl: true,
        title: true,
        description: true,
        duration: true,
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: "비디오를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 처리 중인지 확인 (videoUrl이 임시 URL인 경우)
    const isProcessing = video.videoUrl?.startsWith("processing://") ?? false;

    return NextResponse.json({
      id: video.id,
      isProcessing,
      videoUrl: isProcessing ? null : video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      description: video.description,
      duration: video.duration,
    });
  } catch (error: any) {
    console.error("Error checking video status:", error);
    return NextResponse.json(
      { error: "비디오 상태 확인 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

