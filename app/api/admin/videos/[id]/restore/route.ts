import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(async (req: NextRequest, adminId: string) => {
    try {
      const videoId = params.id;

      const video = await prisma.video.update({
        where: { id: videoId },
        data: {
          isRemoved: false,
          removedAt: null,
          removedReason: null,
        },
      });

      return NextResponse.json({
        message: "비디오가 복원되었습니다",
        video: {
          id: video.id,
          title: video.title,
          isRemoved: video.isRemoved,
        },
      });
    } catch (error) {
      console.error("Error restoring video:", error);
      return NextResponse.json(
        { error: "비디오 복원 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }
  })(req);
}

