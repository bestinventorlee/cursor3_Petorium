import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
  username: z
    .string()
    .min(3, "사용자명은 최소 3자 이상이어야 합니다")
    .max(20, "사용자명은 최대 20자까지 가능합니다")
    .regex(/^[a-zA-Z0-9_]+$/, "사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다"),
  name: z.string().max(50, "이름은 최대 50자까지 가능합니다").optional(),
  password: z
    .string()
    .min(6, "비밀번호는 최소 6자 이상이어야 합니다")
    .max(100, "비밀번호는 최대 100자까지 가능합니다"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 입력 검증
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, username, name, password } = validationResult.data;

    // 이메일 정규화 (소문자 변환 및 공백 제거)
    const normalizedEmail = email.trim().toLowerCase();

    // 이메일 및 사용자명 중복 확인
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === normalizedEmail) {
        return NextResponse.json(
          { error: "이미 사용 중인 이메일입니다" },
          { status: 400 }
        );
      }
      if (existingUser.username === username) {
        return NextResponse.json(
          { error: "이미 사용 중인 사용자명입니다" },
          { status: 400 }
        );
      }
    }

    // 비밀번호 해시 (salt rounds 12로 통일)
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성 (정규화된 이메일 저장)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        name: name || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

