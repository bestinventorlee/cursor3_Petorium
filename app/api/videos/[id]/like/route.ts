import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSocketIO } from "@/lib/socket";

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

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.id,
        },
      },
    });

    if (existingLike) {
      // 이미 좋아요를 눌렀으면 취소
      await prisma.like.delete({
        where: {
          userId_videoId: {
            userId: session.user.id,
            videoId: params.id,
          },
        },
      });

      // 실시간 업데이트
      try {
        const io = getSocketIO();
        io.to(`video:${params.id}`).emit("video-unliked", {
          videoId: params.id,
          userId: session.user.id,
        });
      } catch (error) {
        console.log("Socket.io not available");
      }

      return NextResponse.json({ liked: false });
    } else {
      // 좋아요 추가
      await prisma.like.create({
        data: {
          userId: session.user.id,
          videoId: params.id,
        },
      });

      // 실시간 업데이트
      try {
        const io = getSocketIO();
        io.to(`video:${params.id}`).emit("video-liked", {
          videoId: params.id,
          userId: session.user.id,
        });
      } catch (error) {
        console.log("Socket.io not available");
      }

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: "좋아요 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ liked: false });
    }

    const like = await prisma.like.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.id,
        },
      },
    });

    return NextResponse.json({ liked: !!like });
  } catch (error) {
    console.error("Error checking like:", error);
    return NextResponse.json(
      { error: "좋아요 상태를 확인하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

