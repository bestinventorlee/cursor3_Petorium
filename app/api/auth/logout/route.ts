import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sessionCookiePaths } from "@/lib/auth-cookie-paths";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (session) {
      console.log("[Logout API] Logging out user:", session.user?.id);
    }

    // 응답 생성
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

    const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    const paths = sessionCookiePaths();

    cookieNames.forEach((name) => {
      response.cookies.delete(name);
      paths.forEach((path) => {
        response.cookies.set(name, "", {
          expires: new Date(0),
          path,
          httpOnly: true,
          sameSite: "lax",
          secure: isSecure,
          maxAge: 0,
        });
      });
    });

    const setCookieHeaders: string[] = [];
    cookieNames.forEach((name) => {
      paths.forEach((path) => {
        setCookieHeaders.push(
          `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}; Max-Age=0`
        );
      });
    });
    
    // 모든 쿠키 삭제 헤더 추가
    setCookieHeaders.forEach((cookie) => {
      response.headers.append("Set-Cookie", cookie);
    });

    console.log("[Logout API] Cookies deletion headers set:", setCookieHeaders.length, "headers");
    return response;
  } catch (error) {
    console.error("[Logout API] Error:", error);
    return NextResponse.json(
      { error: "로그아웃 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

