import crypto from "crypto";

/** 비밀번호 재설정 URL에 쓰이는 토큰(평문)을 DB 보관용 해시로 변환합니다. */
export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
