import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRandomFeedOrder, shuffleArray } from "@/lib/shuffle";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const playableWhere = {
      isRemoved: false,
      isFlagged: false,
      AND: [
        {
          videoUrl: {
            not: {
              startsWith: "processing://",
            },
          },
        },
        {
          videoUrl: {
            not: {
              startsWith: "error://",
            },
          },
        },
      ],
    };

    const useRandom = isRandomFeedOrder();
    const fetchSkip = useRandom ? 0 : skip;
    const fetchTake = useRandom ? Math.min(limit * 8, 200) : limit;

    let videos = await prisma.video.findMany({
      where: playableWhere,
      skip: fetchSkip,
      take: fetchTake,
      orderBy: {
        createdAt: "desc",
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
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (useRandom) {
      videos = shuffleArray(videos).slice(skip, skip + limit);
    }

    const total = await prisma.video.count({
      where: playableWhere,
    });

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
      { error: "비디오를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, videoUrl, thumbnailUrl, duration } = body;

    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: "제목과 비디오 URL은 필수입니다" },
        { status: 400 }
      );
    }

    const video = await prisma.video.create({
      data: {
        title,
        description,
        videoUrl,
        thumbnailUrl,
        duration: duration ? Math.round(duration) : null,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      { error: "비디오를 생성하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

