import nodemailer from "nodemailer";
import { withBasePath } from "@/lib/base-path";

function buildResetUrl(token: string): string {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const path = withBasePath(
    `/auth/reset-password?token=${encodeURIComponent(token)}`
  );
  return `${base}${path}`;
}

/**
 * SMTP 환경 변수가 있으면 메일을 보냅니다.
 * 없으면 메일을 보내지 않고, 개발 환경에서만 URL을 로그합니다.
 */
export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<{ sent: boolean; resetUrl: string }> {
  const resetUrl = buildResetUrl(token);

  const host = process.env.SMTP_HOST;

  if (!host) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Petorium] SMTP 미설정 — 비밀번호 재설정 URL:", resetUrl);
    }
    return { sent: false, resetUrl };
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      user && pass !== undefined
        ? { user, pass }
        : undefined,
  });

  const from =
    process.env.SMTP_FROM ?? "Petorium <noreply@localhost>";

  await transporter.sendMail({
    from,
    to,
    subject: "[Petorium] 비밀번호 재설정",
    text: [
      "아래 링크를 클릭하여 비밀번호를 재설정하세요.",
      "",
      resetUrl,
      "",
      "링크는 1시간 후 만료됩니다.",
      "본인이 요청하지 않았다면 이 메일을 무시하세요.",
    ].join("\n"),
    html: `<p>아래 버튼 또는 링크를 통해 비밀번호를 재설정할 수 있습니다.</p>
<p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#FF6B6B;color:#fff;text-decoration:none;border-radius:8px;">비밀번호 재설정</a></p>
<p style="word-break:break-all;font-size:12px;color:#666;">${resetUrl}</p>
<p style="font-size:12px;color:#666;">링크는 1시간 후 만료됩니다. 본인이 요청하지 않았다면 무시하세요.</p>`,
  });

  return { sent: true, resetUrl };
}
