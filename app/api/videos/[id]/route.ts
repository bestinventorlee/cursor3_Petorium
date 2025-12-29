import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

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
            name: true,
            bio: true,
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

    // 조회수 증가
    await prisma.video.update({
      where: { id: params.id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "비디오를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const video = await prisma.video.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json(
        { error: "비디오를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 권한 확인: 비디오 소유자만 삭제 가능
    if (video.userId !== session.user.id) {
      return NextResponse.json(
        { error: "비디오를 삭제할 권한이 없습니다" },
        { status: 403 }
      );
    }

    await prisma.video.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "비디오가 삭제되었습니다" });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "비디오를 삭제하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

const updateVideoSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").max(200, "제목은 200자 이하여야 합니다").optional(),
  description: z.string().max(5000, "설명은 5000자 이하여야 합니다").optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const video = await prisma.video.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json(
        { error: "비디오를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 권한 확인: 비디오 소유자만 수정 가능
    if (video.userId !== session.user.id) {
      return NextResponse.json(
        { error: "비디오를 수정할 권한이 없습니다" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateVideoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const updateData: { title?: string; description?: string } = {};
    if (validationResult.data.title !== undefined) {
      updateData.title = validationResult.data.title;
    }
    if (validationResult.data.description !== undefined) {
      updateData.description = validationResult.data.description;
    }

    const updatedVideo = await prisma.video.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            bio: true,
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

    return NextResponse.json(updatedVideo);
  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { error: "비디오를 수정하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

