"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import SearchBar from "./SearchBar";
import { withBasePath } from "@/lib/base-path";

// 로그아웃 플래그 확인 헬퍼 함수
function isLogoutInProgress(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("_logout_in_progress") === "true";
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(() => isLogoutInProgress());

  // 로그아웃 플래그 확인 및 업데이트
  useEffect(() => {
    const checkLogoutFlag = () => {
      const logoutFlag = isLogoutInProgress();
      if (logoutFlag !== isLoggingOut) {
        console.log(`[Navbar] Logout flag changed: ${logoutFlag}`);
        setIsLoggingOut(logoutFlag);
      }
    };

    // 초기 체크
    checkLogoutFlag();

    // 주기적으로 체크 (로그아웃 플래그 변경 감지)
    const interval = setInterval(checkLogoutFlag, 100);
    return () => clearInterval(interval);
  }, [isLoggingOut]);

  // 세션 상태 로깅 (디버깅용)
  useEffect(() => {
    // 로그아웃 중이면 세션을 무시 (가장 먼저 체크)
    const logoutFlag = isLogoutInProgress();
    if (logoutFlag || isLoggingOut) {
      console.log("[Navbar] Logout in progress, ignoring session");
      return;
    }
    
    console.log("[Navbar] Session status:", status);
    console.log("[Navbar] Session data:", session);
    console.log("[Navbar] User:", session?.user);
    console.log("[Navbar] Should show logout button:", status === "authenticated" && !!session && !isLoggingOut);
  }, [status, session, isLoggingOut]);

  return (
    <nav className="global-navbar sticky top-0 z-50 hidden border-b border-[#1f1f1f] bg-[#050505]/95 backdrop-blur-md md:block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex shrink-0 flex-col items-start">
            <span className="font-display text-2xl font-extrabold tracking-tight text-[#FF6B6B]">
              Petorium
            </span>
            <span className="hidden text-[11px] text-[#555] lg:block">
              반려인을 위한 숏폼 비디오
            </span>
          </Link>

          <div className="mx-4 max-w-2xl flex-1">
            <SearchBar placeholder="검색..." className="w-full" />
          </div>

          <div className="flex shrink-0 items-center space-x-4">
            <Link
              href="/"
              className="whitespace-nowrap text-[#888] transition hover:text-[#FF6B6B]"
            >
              홈
            </Link>
            <Link
              href="/feed"
              className="whitespace-nowrap text-[#888] transition hover:text-[#FF6B6B]"
            >
              피드
            </Link>
            <Link
              href="/trending"
              className="whitespace-nowrap text-[#888] transition hover:text-[#FF6B6B]"
            >
              트렌딩
            </Link>
            {session && (
              <Link
                href="/upload"
                className="whitespace-nowrap text-[#888] transition hover:text-[#FF6B6B]"
              >
                업로드
              </Link>
            )}

            {/* 세션 상태에 따른 버튼 표시 */}
            {status === "loading" ? (
              <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-[#FF6B6B] border-t-transparent"></div>
            ) : status === "authenticated" && session && !isLoggingOut ? (
              <div className="flex items-center gap-3">
                {session.user && (
                  <Link
                    href={session.user?.username ? `/user/${session.user.username}` : `/user/${session.user.email?.split("@")[0]}`}
                    className="flex items-center space-x-2 whitespace-nowrap transition hover:opacity-80"
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">
                          {session.user.name?.[0] || session.user.email?.[0] || "U"}
                        </span>
                      </div>
                    )}
                    <span className="hidden text-[#ccc] lg:inline">
                      {session.user.name || session.user.email}
                    </span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("정말 로그아웃하시겠습니까?")) {
                      try {
                        console.log("[Navbar] Logging out...");
                        
                        // 스토리지 정리
                        if (typeof window !== "undefined") {
                          localStorage.clear();
                          sessionStorage.clear();
                        }
                        
                        // 1. NextAuth signout API 직접 호출
                        try {
                          await fetch(withBasePath("/api/auth/signout"), {
                            method: "POST",
                            credentials: "include",
                          });
                        } catch (err) {
                          console.warn("[Navbar] Signout API error:", err);
                        }
                        
                        // 2. NextAuth signOut 함수 호출
                        await signOut({ 
                          redirect: false,
                          callbackUrl: withBasePath("/auth/signin")
                        });
                        
                        // 3. 강제로 로그인 페이지로 이동
                        setTimeout(() => {
                          window.location.replace(withBasePath("/auth/signin"));
                        }, 300);
                      } catch (error) {
                        console.error("Logout error:", error);
                        // 에러 발생 시에도 로그인 페이지로 이동
                        window.location.href = withBasePath("/auth/signin");
                      }
                    }
                  }}
                  className="flex-shrink-0 whitespace-nowrap rounded-md bg-[#FF6B6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#ff8585]"
                  style={{ minWidth: "80px", display: "inline-block" }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/auth/signin")}
                className="flex-shrink-0 whitespace-nowrap rounded-md bg-[#FF6B6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#ff8585]"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

