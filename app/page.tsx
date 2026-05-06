import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-[#050505] px-6 py-16 md:min-h-screen">
      <div className="z-10 w-full max-w-lg text-center">
        <p className="mb-2 font-display text-5xl font-extrabold tracking-tight text-[#FF6B6B] md:text-6xl">
          Petorium
        </p>
        <p className="mb-10 text-sm text-[#666]">반려인을 위한 숏폼 비디오</p>
        <p className="mb-12 text-lg leading-relaxed text-[#bbb]">
          짧은 영상으로 반려 생활을 공유해 보세요.
        </p>
        <Link
          href="/feed"
          className="inline-flex rounded-full bg-[#FF6B6B] px-10 py-4 text-base font-bold text-white shadow-lg shadow-[#FF6B6B]/25 transition hover:bg-[#ff8585]"
        >
          피드로 이동 →
        </Link>
      </div>
    </main>
  );
}

