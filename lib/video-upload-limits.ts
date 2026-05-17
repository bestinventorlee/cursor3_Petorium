/**
 * 비디오 업로드 길이 제한 (초).
 * 0 이면 해당 방향 제한 없음 — 기본값은 길이 제한 없음.
 */
function parseLimit(value: string | undefined): number {
  if (value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function getVideoDurationLimits() {
  return {
    minSeconds: parseLimit(process.env.VIDEO_MIN_DURATION_SECONDS),
    maxSeconds: parseLimit(process.env.VIDEO_MAX_DURATION_SECONDS),
  };
}

export function getPublicVideoDurationLimits() {
  return {
    minSeconds: parseLimit(process.env.NEXT_PUBLIC_VIDEO_MIN_DURATION_SECONDS),
    maxSeconds: parseLimit(process.env.NEXT_PUBLIC_VIDEO_MAX_DURATION_SECONDS),
  };
}

export function validateVideoDuration(
  durationSeconds: number,
  limits: { minSeconds: number; maxSeconds: number }
): string | null {
  if (limits.minSeconds > 0 && durationSeconds < limits.minSeconds) {
    return `비디오 길이는 최소 ${limits.minSeconds}초 이상이어야 합니다`;
  }
  if (limits.maxSeconds > 0 && durationSeconds > limits.maxSeconds) {
    return `비디오 길이는 최대 ${limits.maxSeconds}초까지 가능합니다`;
  }
  return null;
}
