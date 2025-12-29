import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

/**
 * Require admin role
 */
export async function requireAdmin(req: NextRequest): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("인증이 필요합니다");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isBanned: true },
  });

  if (!user) {
    throw new Error("사용자를 찾을 수 없습니다");
  }

  if (user.isBanned) {
    throw new Error("차단된 계정입니다");
  }

  if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
    throw new Error("관리자 권한이 필요합니다");
  }

  return user.id;
}

/**
 * Middleware wrapper for admin routes
 */
export function withAdmin(
  handler: (req: NextRequest, adminId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const adminId = await requireAdmin(req);
      return await handler(req, adminId);
    } catch (error: any) {
      if (error.message === "인증이 필요합니다") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message === "관리자 권한이 필요합니다" || error.message === "차단된 계정입니다") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      console.error("Admin middleware error:", error);
      return NextResponse.json(
        { error: "권한 확인 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }
  };
}

