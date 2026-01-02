import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "인증이 필요합니다" },
          { status: 401 }
        );
      }

      return await handler(req, session.user.id);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "인증 처리 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }
  };
}

export async function requireAuth(req: NextRequest): Promise<string> {
  // Next.js App Router에서 쿠키를 읽기 위해 요청 객체를 전달해야 함
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    console.error("[Auth] No session found in requireAuth");
    throw new Error("인증이 필요합니다");
  }

  return session.user.id;
}

