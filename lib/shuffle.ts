/** Fisher–Yates 셔플 (원본 배열 변경 없음) */
export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 피드 기본: 무작위 순서 (FEED_RANDOM_ORDER=false 로 점수순 고정) */
export function isRandomFeedOrder(): boolean {
  return process.env.FEED_RANDOM_ORDER !== "false";
}
