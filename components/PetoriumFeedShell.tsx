"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const TAG_FILTERS: { key: string; label: string }[] = [
  { key: "All", label: "전체" },
  { key: "Dog", label: "강아지" },
  { key: "Cat", label: "고양이" },
  { key: "Rabbit", label: "토끼" },
  { key: "Bird", label: "새" },
  { key: "Exotic", label: "기타" },
];

type PetoriumFeedShellProps = {
  activeTag: string;
  onTagChange: (key: string) => void;
  phoneFrame: React.ReactNode;
  rightPanel: React.ReactNode;
};

export default function PetoriumFeedShell({
  activeTag,
  onTagChange,
  phoneFrame,
  rightPanel,
}: PetoriumFeedShellProps) {
  const pathname = usePathname();

  const navItems: [string, string, string][] = [
    ["🏠", "피드", "/feed"],
    ["🔍", "발견", "/search"],
    ["➕", "업로드", "/upload"],
    ["❤️", "트렌딩", "/trending"],
    ["👤", "프로필", "/profile"],
  ];

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center gap-8 overflow-hidden bg-black px-4 py-6 font-sans text-white md:gap-10 lg:gap-14">
      {/* 좌측 사이드바 */}
      <aside className="hidden shrink-0 flex-col gap-8 text-white md:flex" style={{ minWidth: 180 }}>
        <div>
          <div className="font-display text-[28px] font-extrabold tracking-tight text-[#FF6B6B]">
            Petorium
          </div>
          <p className="mt-0.5 text-xs text-[#666]">반려인을 위한 숏폼 비디오</p>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map(([icon, label, href]) => (
            <Link
              key={label}
              href={href}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                pathname === href ||
                (href !== "/" && pathname.startsWith(href))
                  ? "bg-[rgba(255,107,107,0.15)] text-[#FF6B6B]"
                  : "text-[#888] hover:bg-white/5 hover:text-[#ccc]"
              }`}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div>
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#555]">
            필터
          </div>
          <div className="flex flex-col gap-1.5">
            {TAG_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onTagChange(key)}
                className={`rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors ${
                  activeTag === key
                    ? "bg-[#FF6B6B] font-bold text-white"
                    : "bg-white/5 font-normal text-[#666] hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 폰 프레임 */}
      <div className="relative shrink-0">{phoneFrame}</div>

      {/* 우측 패널 */}
      <aside
        className="hidden min-w-[180px] shrink-0 flex-col gap-5 text-sm md:flex"
        style={{ maxWidth: 220 }}
      >
        {rightPanel}
      </aside>
    </div>
  );
}
