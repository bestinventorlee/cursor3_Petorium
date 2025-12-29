import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10);

    if (!query.trim() || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchQuery = query.trim();

    // Get suggestions from videos, users, and hashtags
    const [videoSuggestions, userSuggestions, hashtagSuggestions] =
      await Promise.all([
        // Video title suggestions
        prisma.video.findMany({
          where: {
            title: { contains: searchQuery, mode: "insensitive" },
          },
          take: limit,
          select: {
            id: true,
            title: true,
          },
          orderBy: { views: "desc" },
        }),

        // User suggestions
        prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: searchQuery, mode: "insensitive" } },
              { name: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
          take: limit,
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
          orderBy: { followers: "desc" },
        }),

        // Hashtag suggestions
        prisma.hashtag.findMany({
          where: {
            name: { contains: searchQuery, mode: "insensitive" },
          },
          take: limit,
          select: {
            id: true,
            name: true,
            videoCount: true,
          },
          orderBy: { videoCount: "desc" },
        }),
      ]);

    const suggestions = [
      ...videoSuggestions.map((v) => ({
        id: v.id,
        text: v.title,
        type: "video" as const,
      })),
      ...userSuggestions.map((u) => ({
        id: u.id,
        text: u.name || u.username,
        username: u.username,
        avatar: u.avatar,
        type: "user" as const,
      })),
      ...hashtagSuggestions.map((h) => ({
        id: h.id,
        text: `#${h.name}`,
        name: h.name,
        videoCount: h.videoCount,
        type: "hashtag" as const,
      })),
    ].slice(0, limit * 3);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "제안을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

