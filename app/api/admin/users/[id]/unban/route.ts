import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(async (req: NextRequest, adminId: string) => {
    try {
      const userId = params.id;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          bannedAt: null,
          bannedReason: null,
        },
      });

      return NextResponse.json({
        message: "사용자 차단이 해제되었습니다",
        user: {
          id: user.id,
          username: user.username,
          isBanned: user.isBanned,
        },
      });
    } catch (error) {
      console.error("Error unbanning user:", error);
      return NextResponse.json(
        { error: "사용자 차단 해제 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }
  })(req);
}

