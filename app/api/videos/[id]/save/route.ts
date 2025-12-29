import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    // 비디오가 존재하는지 확인
    const video = await prisma.video.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json(
        { error: "비디오를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const existingSave = await prisma.savedVideo.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.id,
        },
      },
    });

    if (existingSave) {
      // 이미 저장했으면 취소
      await prisma.savedVideo.delete({
        where: {
          userId_videoId: {
            userId: session.user.id,
            videoId: params.id,
          },
        },
      });

      return NextResponse.json({ saved: false });
    } else {
      // 저장 추가
      await prisma.savedVideo.create({
        data: {
          userId: session.user.id,
          videoId: params.id,
        },
      });

      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error("Error toggling save:", error);
    return NextResponse.json(
      { error: "저장 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

