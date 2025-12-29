import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "next-auth/react";

const loginSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 입력 검증
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다" },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다" },
        { status: 401 }
      );
    }

    // NextAuth를 통한 로그인은 클라이언트에서 처리
    // 여기서는 사용자 정보만 반환
    return NextResponse.json({
      message: "로그인 성공",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json(
      { error: "로그인 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

