import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSocketIO } from "@/lib/socket";

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;

    // 최상위 댓글만 가져오기 (답글 제외)
    const comments = await prisma.comment.findMany({
      where: {
        videoId: params.id,
        parentId: null, // 최상위 댓글만
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
            replies: true,
          },
        },
        replies: {
          take: 3, // 최근 답글 3개만 미리 로드
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.comment.count({
      where: {
        videoId: params.id,
        parentId: null,
      },
    });

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "댓글을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const validationResult = commentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { content, parentId } = validationResult.data;

    // 부모 댓글이 존재하는지 확인 (답글인 경우)
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: { video: true },
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: "부모 댓글을 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      if (parentComment.videoId !== params.id) {
        return NextResponse.json(
          { error: "잘못된 비디오입니다" },
          { status: 400 }
        );
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: session.user.id,
        videoId: params.id,
        parentId: parentId || null,
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
            replies: true,
          },
        },
      },
    });

    // 실시간 업데이트 전송
    try {
      const io = getSocketIO();
      io.to(`video:${params.id}`).emit("comment-added", {
        ...comment,
        videoId: params.id,
      });
    } catch (error) {
      // Socket.io가 초기화되지 않은 경우 무시
      console.log("Socket.io not available");
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "댓글을 작성하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
