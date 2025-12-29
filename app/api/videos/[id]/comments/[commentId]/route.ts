import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { getSocketIO } from "@/lib/socket";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const userId = await requireAuth(request);

    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "댓글을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 자신의 댓글만 삭제 가능
    if (comment.userId !== userId) {
      return NextResponse.json(
        { error: "댓글을 삭제할 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 댓글 삭제 (답글도 함께 삭제됨 - cascade)
    await prisma.comment.delete({
      where: { id: params.commentId },
    });

    // 실시간 업데이트 전송
    try {
      const io = getSocketIO();
      io.to(`video:${params.id}`).emit("comment-deleted", {
        videoId: params.id,
        commentId: params.commentId,
      });
    } catch (error) {
      // Socket.io가 초기화되지 않은 경우 무시
      console.log("Socket.io not available");
    }

    return NextResponse.json({ message: "댓글이 삭제되었습니다" });
  } catch (error: any) {
    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "댓글을 삭제하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const skip = (page - 1) * limit;

    // 특정 댓글의 답글 가져오기
    const replies = await prisma.comment.findMany({
      where: {
        parentId: params.commentId,
      },
      skip,
      take: limit,
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
    });

    const total = await prisma.comment.count({
      where: {
        parentId: params.commentId,
      },
    });

    return NextResponse.json({
      replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching replies:", error);
    return NextResponse.json(
      { error: "답글을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

