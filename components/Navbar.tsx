"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">Petorium</h1>
          </Link>

          <div className="flex-1 max-w-2xl mx-4">
            <SearchBar placeholder="검색..." className="w-full" />
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
            >
              홈
            </Link>
            <Link
              href="/feed"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
            >
              피드
            </Link>
            <Link
              href="/trending"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
            >
              트렌딩
            </Link>
            {session && (
              <Link
                href="/upload"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
              >
                업로드
              </Link>
            )}

            {session ? (
              <>
                <Link
                  href={`/user/${session.user.email?.split("@")[0]}`}
                  className="flex items-center space-x-2"
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
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {session.user.name?.[0] || session.user.email?.[0] || "U"}
                      </span>
                    </div>
                  )}
                  <span className="text-gray-700 dark:text-gray-300">
                    {session.user.name || session.user.email}
                  </span>
                </Link>
                <button
                  onClick={async () => {
                    if (confirm("정말 로그아웃하시겠습니까?")) {
                      try {
                        await signOut({ redirect: false });
                        // CSRF 토큰 제거
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("csrf-token");
                          sessionStorage.clear();
                        }
                        // 강제로 페이지 새로고침
                        window.location.href = "/";
                      } catch (error) {
                        console.error("Logout error:", error);
                        window.location.href = "/";
                      }
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
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

