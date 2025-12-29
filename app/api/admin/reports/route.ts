import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reviewReportSchema = z.object({
  reportId: z.string(),
  status: z.enum(["RESOLVED", "DISMISSED"]),
  notes: z.string().optional(),
});

// Get all reports
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          video: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "신고 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

// Review report
export const POST = withAdmin(async (req: NextRequest, adminId: string) => {
  try {
    const body = await req.json();
    const validationResult = reviewReportSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { reportId, status, notes } = validationResult.data;

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        notes,
      },
    });

    return NextResponse.json({
      message: "신고가 검토되었습니다",
      report: {
        id: report.id,
        status: report.status,
      },
    });
  } catch (error) {
    console.error("Error reviewing report:", error);
    return NextResponse.json(
      { error: "신고 검토 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

