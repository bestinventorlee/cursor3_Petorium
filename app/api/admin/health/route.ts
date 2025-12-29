import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      services: {} as Record<string, any>,
    };

    // Database health
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.services.database = {
        status: "healthy",
        responseTime: Date.now(),
      };
    } catch (error) {
      health.status = "degraded";
      health.services.database = {
        status: "unhealthy",
        error: (error as Error).message,
      };
    }

    // Redis health
    try {
      const redis = await getRedisClient();
      if (redis) {
        const start = Date.now();
        await redis.ping();
        health.services.redis = {
          status: "healthy",
          responseTime: Date.now() - start,
        };
      } else {
        health.services.redis = {
          status: "not_configured",
        };
      }
    } catch (error) {
      health.status = "degraded";
      health.services.redis = {
        status: "unhealthy",
        error: (error as Error).message,
      };
    }

    // System metrics
    const [activeUsers, activeVideos, pendingReports] = await Promise.all([
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.video.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          isRemoved: false,
        },
      }),
      prisma.report.count({
        where: { status: "PENDING" },
      }),
    ]);

    health.services.metrics = {
      activeUsers24h: activeUsers,
      activeVideos24h: activeVideos,
      pendingReports,
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error("Error checking health:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "헬스 체크 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
});

