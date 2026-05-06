"use client";

import { useEffect } from "react";

/** 데스크톱(md+)에서 /feed 일 때 글로벌 네비를 숨기고 몰입 레이아웃을 씁니다. */
export default function FeedImmersiveChrome() {
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      if (mq.matches) {
        document.body.classList.add("feed-immersive");
      } else {
        document.body.classList.remove("feed-immersive");
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.classList.remove("feed-immersive");
    };
  }, []);

  return null;
}
