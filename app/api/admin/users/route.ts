import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const banUserSchema = z.object({
  userId: z.string(),
  reason: z.string().optional(),
});

const deleteUserSchema = z.object({
  userId: z.string(),
});

// Get all users with pagination
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const isBanned = searchParams.get("banned") === "true" ? true : searchParams.get("banned") === "false" ? false : undefined;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role) {
      where.role = role;
    }
    if (isBanned !== undefined) {
      where.isBanned = isBanned;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          isBanned: true,
          bannedAt: true,
          bannedReason: true,
          followers: true,
          following: true,
          createdAt: true,
          _count: {
            select: {
              videos: true,
              comments: true,
              likes: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "사용자 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

// Ban user
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validationResult = banUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId, reason } = validationResult.data;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: reason || "관리자에 의해 차단됨",
      },
    });

    return NextResponse.json({
      message: "사용자가 차단되었습니다",
      user: {
        id: user.id,
        username: user.username,
        isBanned: user.isBanned,
      },
    });
  } catch (error) {
    console.error("Error banning user:", error);
    return NextResponse.json(
      { error: "사용자 차단 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

// Delete user
export const DELETE = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validationResult = deleteUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId } = validationResult.data;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === "ADMIN") {
      return NextResponse.json(
        { error: "관리자 계정은 삭제할 수 없습니다" },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "사용자가 삭제되었습니다",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "사용자 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
});

