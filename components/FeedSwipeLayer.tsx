"use client";

import { useEffect, useRef } from "react";
import { setupTouchGestures } from "@/lib/touch-gestures";

/**
 * MobileVideoPlayer가 없는 슬롯(광고 등)에서도 동일한 세로 스와이프로 피드를 넘깁니다.
 */
export default function FeedSwipeLayer({
  children,
  onSwipeUp,
  onSwipeDown,
  className = "",
}: {
  children: React.ReactNode;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return setupTouchGestures(el, {
      onSwipeUp,
      onSwipeDown,
    });
  }, [onSwipeUp, onSwipeDown]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ touchAction: "none" }}
    >
      {children}
    </div>
  );
}
