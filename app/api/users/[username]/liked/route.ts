import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { username: params.username },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 자신의 좋아요한 비디오만 볼 수 있음
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.id !== user.id) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 좋아요한 비디오 가져오기
    const likes = await prisma.like.findMany({
      where: { userId: user.id },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        video: {
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
        },
      },
    });

    const total = await prisma.like.count({
      where: { userId: user.id },
    });

    const videos = likes.map((like) => like.video);

    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching liked videos:", error);
    return NextResponse.json(
      { error: "비디오를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

