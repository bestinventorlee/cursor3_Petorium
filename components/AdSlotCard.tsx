"use client";

/** 와이어프레임과 동일한 스폰서 슬롯 UI (데모용) */
export default function AdSlotCard() {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]"
      role="region"
      aria-label="스폰서 콘텐츠"
    >
      <div className="absolute left-4 top-4 rounded bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#aaa]">
        SPONSORED
      </div>
      <div className="mb-4 text-[56px] leading-none">🦴</div>
      <div
        className="mb-2 px-8 text-center font-display text-[22px] font-bold text-white"
        style={{ fontFamily: "var(--font-syne), serif" }}
      >
        PetNutrition Co.
      </div>
      <p className="mb-7 max-w-[280px] px-10 text-center text-sm leading-relaxed text-[#ccc]">
        반려동물에게 필요한 영양을 선물하세요
      </p>
      <button
        type="button"
        className="rounded-full bg-[#FF6B6B] px-8 py-3 text-[15px] font-bold tracking-wide text-white"
      >
        쇼핑하기 →
      </button>
    </div>
  );
}
