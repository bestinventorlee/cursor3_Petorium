import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "video";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;

    if (!query.trim()) {
      return NextResponse.json({
        results: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const searchQuery = query.trim();

    switch (type) {
      case "video": {
        // Search videos by title or description
        const videos = await prisma.video.findMany({
          where: {
            OR: [
              { title: { contains: searchQuery, mode: "insensitive" } },
              { description: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
          skip,
          take: limit,
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
          orderBy: [
            { views: "desc" },
            { createdAt: "desc" },
          ],
        });

        const total = await prisma.video.count({
          where: {
            OR: [
              { title: { contains: searchQuery, mode: "insensitive" } },
              { description: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
        });

        return NextResponse.json({
          results: videos,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }

      case "user": {
        // Search users by username, name, or bio
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: searchQuery, mode: "insensitive" } },
              { name: { contains: searchQuery, mode: "insensitive" } },
              { bio: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
          skip,
          take: limit,
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            bio: true,
            followers: true,
            following: true,
            _count: {
              select: {
                videos: true,
              },
            },
          },
          orderBy: [
            { followers: "desc" },
          ],
        });

        const total = await prisma.user.count({
          where: {
            OR: [
              { username: { contains: searchQuery, mode: "insensitive" } },
              { name: { contains: searchQuery, mode: "insensitive" } },
              { bio: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
        });

        return NextResponse.json({
          results: users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }

      case "hashtag": {
        // Search hashtags
        const hashtags = await prisma.hashtag.findMany({
          where: {
            name: { contains: searchQuery, mode: "insensitive" },
          },
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                videos: true,
              },
            },
          },
          orderBy: [
            { videoCount: "desc" },
            { name: "asc" },
          ],
        });

        const total = await prisma.hashtag.count({
          where: {
            name: { contains: searchQuery, mode: "insensitive" },
          },
        });

        return NextResponse.json({
          results: hashtags,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid search type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

