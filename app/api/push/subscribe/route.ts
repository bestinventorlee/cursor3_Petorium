import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = await request.json();
    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription is required" },
        { status: 400 }
      );
    }

    // Store subscription in database
    // You would need to add a PushSubscription model to your Prisma schema
    // For now, we'll just return success

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error subscribing to push:", error);
    return NextResponse.json(
      { error: "푸시 알림 구독 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

