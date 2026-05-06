"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { data: session, status: sessionStatus } = useSession();

  // 로그아웃 상태 확인: 세션이 로딩 중이 아니고, 세션이 없으면 로그아웃 상태
  const isAuthenticated = sessionStatus !== "loading" && !!session && !!user;

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  // 프로필 링크를 동적으로 생성
  const getProfileHref = () => {
    return isAuthenticated ? (user?.username ? `/user/${user.username}` : "/profile") : "/auth/signin";
  };

  const navItems: Array<{
    href: string | (() => string);
    label: string;
    icon: React.ReactNode;
    requireAuth?: boolean;
  }> = [
    {
      href: "/",
      label: "홈",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      href: "/feed",
      label: "피드",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      href: "/upload",
      label: "업로드",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
      requireAuth: true,
    },
    {
      href: "/trending",
      label: "트렌딩",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      href: getProfileHref,
      label: "프로필",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="global-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/70 backdrop-blur-[16px] md:hidden">
      <div className="safe-bottom flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          if (item.requireAuth && !isAuthenticated) {
            return null;
          }

          const href = typeof item.href === "function" ? item.href() : item.href;
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center ${
                  active ? "text-[#FF6B6B]" : "text-[#666]"
                }`}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </motion.div>
              {active && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute left-0 right-0 top-0 h-1 bg-[#FF6B6B]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

