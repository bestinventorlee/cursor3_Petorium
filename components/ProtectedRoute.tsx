"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "next-auth/react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export default function ProtectedRoute({
  children,
  redirectTo = "/auth/signin",
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 로딩 중이면 대기
    if (loading || sessionStatus === "loading") {
      return;
    }

    // 인증이 필요한데 세션과 사용자가 모두 없으면 리다이렉트
    if (requireAuth && (!user || !session)) {
      console.log("[ProtectedRoute] No user or session, redirecting to:", redirectTo);
      // 쿠키 확인하여 확실하게 체크
      const hasSessionCookie = typeof document !== "undefined" && 
        document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='));
      
      if (!hasSessionCookie) {
        // 쿠키가 없으면 강제로 로그인 페이지로 이동
        window.location.href = `${redirectTo}?logout=true`;
        return;
      }
      
      router.push(redirectTo);
      router.refresh();
    } else if (!requireAuth && user && session) {
      // 이미 로그인한 사용자가 로그인 페이지에 접근하려고 할 때
      router.push("/");
    }
  }, [user, loading, session, sessionStatus, requireAuth, redirectTo, router]);

  if (loading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (requireAuth && (!user || !session)) {
    return null;
  }

  if (!requireAuth && user && session) {
    return null;
  }

  return <>{children}</>;
}

