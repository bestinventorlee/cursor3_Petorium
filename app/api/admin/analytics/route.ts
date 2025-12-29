import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d, all

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    // Total counts
    const [totalUsers, totalVideos, totalViews, totalComments, totalLikes] = await Promise.all([
      prisma.user.count(),
      prisma.video.count({ where: { isRemoved: false } }),
      prisma.video.aggregate({
        where: { isRemoved: false },
        _sum: { views: true },
      }),
      prisma.comment.count(),
      prisma.like.count(),
    ]);

    // Growth metrics
    const [newUsers, newVideos, newViews] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.video.count({
        where: {
          createdAt: { gte: startDate },
          isRemoved: false,
        },
      }),
      prisma.video.aggregate({
        where: {
          createdAt: { gte: startDate },
          isRemoved: false,
        },
        _sum: { views: true },
      }),
    ]);

    // Daily growth data for charts
    const dailyData = [];
    const days = period === "all" ? 90 : parseInt(period.replace("d", ""));
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const [users, videos, views] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        prisma.video.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
            isRemoved: false,
          },
        }),
        prisma.video.aggregate({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
            isRemoved: false,
          },
          _sum: { views: true },
        }),
      ]);

      dailyData.push({
        date: date.toISOString().split("T")[0],
        users,
        videos,
        views: views._sum.views || 0,
      });
    }

    // Top creators
    const topCreators = await prisma.user.findMany({
      take: 10,
      orderBy: { followers: "desc" },
      select: {
        id: true,
        username: true,
        avatar: true,
        followers: true,
        following: true,
        _count: {
          select: {
            videos: true,
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Engagement metrics
    const engagementMetrics = {
      averageViewsPerVideo: totalVideos > 0 ? Math.round((totalViews._sum.views || 0) / totalVideos) : 0,
      averageLikesPerVideo: totalVideos > 0 ? Math.round(totalLikes / totalVideos) : 0,
      averageCommentsPerVideo: totalVideos > 0 ? Math.round(totalComments / totalVideos) : 0,
      engagementRate: totalViews._sum.views
        ? ((totalLikes + totalComments) / (totalViews._sum.views || 1)) * 100
        : 0,
    };

    // Reports summary
    const [pendingReports, totalReports] = await Promise.all([
      prisma.report.count({
        where: { status: "PENDING" },
      }),
      prisma.report.count(),
    ]);

    return NextResponse.json({
      totals: {
        users: totalUsers,
        videos: totalVideos,
        views: totalViews._sum.views || 0,
        comments: totalComments,
        likes: totalLikes,
      },
      growth: {
        newUsers,
        newVideos,
        newViews: newViews._sum.views || 0,
        period,
      },
      dailyData,
      topCreators,
      engagement: engagementMetrics,
      reports: {
        pending: pendingReports,
        total: totalReports,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "분석 데이터를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

