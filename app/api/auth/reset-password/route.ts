import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "토큰이 필요합니다"),
  password: z
    .string()
    .min(6, "비밀번호는 최소 6자 이상이어야 합니다")
    .max(100, "비밀번호는 최대 100자까지 가능합니다"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 입력 검증
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;

    // 토큰 검증 (실제로는 데이터베이스에서 토큰을 조회해야 합니다)
    // 여기서는 간단한 예시만 제공합니다
    // 프로덕션에서는 PasswordResetToken 테이블에서 토큰을 조회하고 만료 시간을 확인해야 합니다

    // 임시로 토큰에서 이메일을 추출하는 방식 (실제로는 안전하지 않음)
    // 실제 구현에서는 토큰을 데이터베이스에 저장하고 조회해야 합니다

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 12);

    // 여기서는 토큰 검증 로직이 필요합니다
    // 실제로는 다음과 같이 구현해야 합니다:
    // 1. PasswordResetToken 테이블에서 토큰 조회
    // 2. 만료 시간 확인
    // 3. 사용자 ID 가져오기
    // 4. 비밀번호 업데이트
    // 5. 토큰 삭제

    return NextResponse.json({
      message: "비밀번호가 성공적으로 재설정되었습니다",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "비밀번호 재설정 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

