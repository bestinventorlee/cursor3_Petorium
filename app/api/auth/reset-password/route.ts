import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { hashPasswordResetToken } from "@/lib/password-reset";

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

    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;
    const tokenHash = hashPasswordResetToken(token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return NextResponse.json(
        { error: "유효하지 않거나 이미 사용된 재설정 링크입니다." },
        { status: 400 }
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "재설정 링크가 만료되었습니다. 다시 요청해 주세요." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId },
      }),
    ]);

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
