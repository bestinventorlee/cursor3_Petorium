import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (session) {
      console.log("[Logout API] Logging out user:", session.user?.id);
    }

    // NextAuth의 signout은 쿠키를 자동으로 삭제하지만,
    // 명시적으로 응답 헤더에 쿠키 삭제 지시를 추가
    const response = NextResponse.json({ 
      success: true,
      message: "로그아웃되었습니다"
    });

    // 모든 next-auth 관련 쿠키 삭제
    const cookieNames = [
      "next-auth.session-token",
      "next-auth.csrf-token",
      "next-auth.callback-url",
    ];

    cookieNames.forEach((name) => {
      // 여러 경로와 도메인으로 쿠키 삭제
      response.cookies.set(name, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      });
      
      // /api 경로용
      response.cookies.set(name, "", {
        expires: new Date(0),
        path: "/api",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      });
    });

    console.log("[Logout API] Cookies deleted");
    return response;
  } catch (error) {
    console.error("[Logout API] Error:", error);
    return NextResponse.json(
      { error: "로그아웃 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

