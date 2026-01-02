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
    const hostname = request.headers.get("host") || "";

    cookieNames.forEach((name) => {
      // 여러 경로로 쿠키 삭제 시도
      const paths = ["/", "/api", "/api/auth"];
      
      paths.forEach((path) => {
        // 기본 경로로 삭제
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: path,
          httpOnly: true,
          sameSite: "lax",
          secure: isSecure,
        });
        
        // 도메인 없이 삭제 (현재 도메인)
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: path,
          httpOnly: true,
          sameSite: "lax",
          secure: isSecure,
          domain: undefined,
        });
      });
      
      // 헤더에 직접 Set-Cookie 추가 (더 확실한 방법)
      const cookieHeader = response.headers.get("Set-Cookie") || "";
      const newCookies = [
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`,
        `${name}=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`,
        `${name}=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`,
      ];
      response.headers.set("Set-Cookie", [...cookieHeader.split(", "), ...newCookies].join(", "));
    });

    console.log("[Logout API] Cookies deletion headers set");
    return response;
  } catch (error) {
    console.error("[Logout API] Error:", error);
    return NextResponse.json(
      { error: "로그아웃 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

