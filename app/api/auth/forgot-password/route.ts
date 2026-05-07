import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";

const forgotPasswordSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
});

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1시간

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        message: "요청하신 이메일로 안내를 보냈습니다. 메일함을 확인해 주세요.",
      });
    }

    const plainToken = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(plainToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      }),
      prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    const { sent, resetUrl } = await sendPasswordResetEmail(
      user.email,
      plainToken
    );

    const responseBody: Record<string, unknown> = {
      message:
        "요청하신 이메일로 안내를 보냈습니다. 메일함을 확인해 주세요.",
    };

    if (process.env.NODE_ENV === "development") {
      responseBody.resetUrl = resetUrl;
      if (!sent) {
        responseBody._notice =
          "SMTP가 설정되지 않았습니다. resetUrl로 직접 접속해 테스트하세요.";
      }
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: "비밀번호 재설정 요청 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
