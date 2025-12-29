import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const forgotPasswordSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 입력 검증
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 보안을 위해 사용자가 존재하지 않아도 성공 메시지 반환
    if (!user) {
      return NextResponse.json({
        message: "이메일이 전송되었습니다. 이메일을 확인해주세요.",
      });
    }

    // 재설정 토큰 생성
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1시간 후 만료

    // 토큰을 데이터베이스에 저장 (실제로는 별도 테이블을 만드는 것이 좋습니다)
    // 여기서는 간단하게 user 모델에 필드를 추가하는 대신, 환경 변수나 Redis를 사용할 수 있습니다
    // 현재는 토큰을 생성만 하고, 실제 저장은 구현하지 않습니다
    // 프로덕션에서는 PasswordResetToken 테이블을 만들어야 합니다

    // 이메일 전송 (실제 구현 필요)
    // await sendPasswordResetEmail(user.email, resetToken);

    // 개발 환경에서는 토큰을 로그로 출력
    if (process.env.NODE_ENV === "development") {
      console.log("Password reset token:", resetToken);
      console.log("Reset URL:", `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`);
    }

    return NextResponse.json({
      message: "이메일이 전송되었습니다. 이메일을 확인해주세요.",
      // 개발 환경에서만 토큰 반환
      ...(process.env.NODE_ENV === "development" && {
        resetToken,
        resetUrl: `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`,
      }),
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: "비밀번호 재설정 요청 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

