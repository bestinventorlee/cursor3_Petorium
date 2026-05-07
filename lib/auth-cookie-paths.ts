/**
 * next.config의 basePath 배포 시 세션 쿠키가 Path=/petorium 등으로 설정될 수 있어
 * 로그아웃 시 동일한 경로에서 만료 헤더를 보냅니다.
 */
export function sessionCookiePaths(): string[] {
  const bp =
    (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "") ||
    (process.env.NODE_ENV === "production" ? "/petorium" : "");
  const paths = ["/", "/api", "/api/auth"];
  if (bp) {
    paths.push(bp, `${bp}/api`, `${bp}/api/auth`);
  }
  return paths;
}
