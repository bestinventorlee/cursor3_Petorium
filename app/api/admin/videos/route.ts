import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const removeVideoSchema = z.object({
  videoId: z.string(),
  reason: z.string().optional(),
});

const flagVideoSchema = z.object({
  videoId: z.string(),
});

// Get all videos with pagination
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const isRemoved = searchParams.get("removed") === "true" ? true : searchParams.get("removed") === "false" ? false : undefined;
    const isFlagged = searchParams.get("flagged") === "true" ? true : searchParams.get("flagged") === "false" ? false : undefined;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isRemoved !== undefined) {
      where.isRemoved = isRemoved;
    }
    if (isFlagged !== undefined) {
      where.isFlagged = isFlagged;
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
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
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.video.count({ where }),
    ]);

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
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "비디오 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

// Remove video
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validationResult = removeVideoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { videoId, reason } = validationResult.data;

    const video = await prisma.video.update({
      where: { id: videoId },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removedReason: reason || "관리자에 의해 제거됨",
      },
    });

    return NextResponse.json({
      message: "비디오가 제거되었습니다",
      video: {
        id: video.id,
        title: video.title,
        isRemoved: video.isRemoved,
      },
    });
  } catch (error) {
    console.error("Error removing video:", error);
    return NextResponse.json(
      { error: "비디오 제거 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

// Flag video
export const PATCH = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validationResult = flagVideoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { videoId } = validationResult.data;

    const video = await prisma.video.update({
      where: { id: videoId },
      data: {
        isFlagged: true,
        flaggedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "비디오가 플래그되었습니다",
      video: {
        id: video.id,
        title: video.title,
        isFlagged: video.isFlagged,
      },
    });
  } catch (error) {
    console.error("Error flagging video:", error);
    return NextResponse.json(
      { error: "비디오 플래그 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

