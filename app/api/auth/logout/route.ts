import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    // 각 쿠키를 여러 경로에서 삭제
    cookieNames.forEach((name) => {
      // Next.js cookies API를 사용하여 삭제
      response.cookies.delete(name);
      
      // 여러 경로에서 명시적으로 삭제 시도
      const paths = ["/", "/api", "/api/auth"];
      paths.forEach((path) => {
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: path,
          httpOnly: true,
          sameSite: "lax",
          secure: isSecure,
          maxAge: 0,
        });
      });
    });

    // Set-Cookie 헤더를 직접 추가하여 확실하게 삭제
    const setCookieHeaders: string[] = [];
    cookieNames.forEach((name) => {
      // 여러 경로와 옵션으로 삭제 헤더 추가
      // Domain을 명시하지 않으면 현재 도메인에서만 삭제됨
      setCookieHeaders.push(
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`,
        `${name}=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`,
        `${name}=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`,
        `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`,
        // Domain 없이도 삭제 시도
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`,
        `${name}=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`,
        `${name}=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`
      );
    });

    // 기존 Set-Cookie 헤더 가져오기
    const existingCookies = response.headers.getSetCookie();
    
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

