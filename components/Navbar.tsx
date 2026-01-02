"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const { data: session, status } = useSession();

  // 세션 상태 로깅 (디버깅용)
  useEffect(() => {
    console.log("[Navbar] Session status:", status);
    console.log("[Navbar] Session data:", session);
    console.log("[Navbar] User:", session?.user);
    console.log("[Navbar] Should show logout button:", status === "authenticated" && !!session);
  }, [status, session]);

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center flex-shrink-0">
            <h1 className="text-2xl font-bold text-blue-600">Petorium</h1>
          </Link>

          <div className="flex-1 max-w-2xl mx-4">
            <SearchBar placeholder="검색..." className="w-full" />
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition whitespace-nowrap"
            >
              홈
            </Link>
            <Link
              href="/feed"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition whitespace-nowrap"
            >
              피드
            </Link>
            <Link
              href="/trending"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition whitespace-nowrap"
            >
              트렌딩
            </Link>
            {session && (
              <Link
                href="/upload"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition whitespace-nowrap"
              >
                업로드
              </Link>
            )}

            {/* 세션 상태에 따른 버튼 표시 */}
            {status === "loading" ? (
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            ) : status === "authenticated" && session ? (
              <div className="flex items-center gap-3">
                {session.user && (
                  <Link
                    href={session.user?.username ? `/user/${session.user.username}` : `/user/${session.user.email?.split("@")[0]}`}
                    className="flex items-center space-x-2 hover:opacity-80 transition whitespace-nowrap"
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
                    <span className="text-gray-700 dark:text-gray-300 hidden lg:inline">
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
                          await fetch("/api/auth/signout", {
                            method: "POST",
                            credentials: "include",
                          });
                        } catch (err) {
                          console.warn("[Navbar] Signout API error:", err);
                        }
                        
                        // 2. NextAuth signOut 함수 호출
                        await signOut({ 
                          redirect: false,
                          callbackUrl: "/auth/signin"
                        });
                        
                        // 3. 강제로 로그인 페이지로 이동
                        setTimeout(() => {
                          window.location.replace("/auth/signin");
                        }, 300);
                      } catch (error) {
                        console.error("Logout error:", error);
                        // 에러 발생 시에도 로그인 페이지로 이동
                        window.location.href = "/auth/signin";
                      }
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition whitespace-nowrap flex-shrink-0"
                  style={{ minWidth: "80px", display: "inline-block" }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signIn()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition whitespace-nowrap flex-shrink-0"
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

