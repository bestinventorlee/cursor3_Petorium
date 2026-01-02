"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession, signIn, signOut, SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string | null;
  image?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, username: string, password: string, name?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0} // 세션 자동 갱신 비활성화
      refetchOnWindowFocus={false} // 창 포커스 시 세션 갱신 비활성화
    >
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading") {
      setLoading(false);
      // 세션이 없으면 명시적으로 로그
      if (status === "unauthenticated") {
        console.log("[AuthContext] User is unauthenticated");
      } else if (status === "authenticated") {
        console.log("[AuthContext] User is authenticated:", session?.user?.id);
      }
    }
  }, [status, session]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        console.error("[Auth] Sign in error:", result.error);
        return { error: result.error };
      }

      if (!result?.ok) {
        console.error("[Auth] Sign in failed:", result);
        return { error: "로그인에 실패했습니다" };
      }

      console.log("[Auth] Sign in successful");
      return {};
    } catch (error: any) {
      console.error("[Auth] Sign in exception:", error);
      return { error: error?.message || "로그인 중 오류가 발생했습니다" };
    }
  };

  const handleSignUp = async (
    email: string,
    username: string,
    password: string,
    name?: string
  ) => {
    try {
      // apiFetch를 사용하여 CSRF 토큰 자동 포함
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "회원가입 중 오류가 발생했습니다" };
      }

      // 회원가입 성공 후 자동 로그인
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        return { error: "회원가입은 완료되었지만 로그인에 실패했습니다" };
      }

      return {};
    } catch (error) {
      console.error("[Auth] Sign up error:", error);
      return { error: "회원가입 중 오류가 발생했습니다" };
    }
  };

  const handleLogout = async () => {
    try {
      console.log("[Auth] Starting logout process...");
      
      // 1. 모든 쿠키 직접 삭제 (먼저 실행)
      if (typeof window !== "undefined") {
        // 모든 next-auth 관련 쿠키 삭제
        const cookies = document.cookie.split(";");
        cookies.forEach((cookie) => {
          const name = cookie.trim().split("=")[0];
          if (name.startsWith("next-auth") || name.includes("session")) {
            // 여러 경로와 도메인으로 시도
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.${window.location.hostname};`;
          }
        });
        
        // 로컬 스토리지 및 세션 스토리지 정리
        localStorage.removeItem("csrf-token");
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // 2. NextAuth signOut 호출
      try {
        await signOut({ 
          redirect: false,
          callbackUrl: "/"
        });
        console.log("[Auth] SignOut completed");
      } catch (signOutError) {
        console.warn("[Auth] SignOut error (continuing anyway):", signOutError);
      }
      
      // 3. 세션 API를 직접 호출하여 세션 제거 시도
      try {
        await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
        }).catch(() => {
          // API가 없어도 계속 진행
        });
      } catch (err) {
        console.warn("[Auth] Signout API error:", err);
      }
      
      // 4. 강제로 페이지 새로고침하여 모든 상태 초기화
      // 즉시 실행하여 세션 상태를 초기화
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("[Auth] Logout error:", error);
      // 에러가 발생해도 강제로 홈으로 이동
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };

  const handleUpdateUser = async (data: Partial<User>) => {
    try {
      await update();
      // 추가적인 사용자 정보 업데이트 로직
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const value: AuthContextType = {
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email!,
          username: (session.user as any).username,
          name: session.user.name,
          image: session.user.image,
        }
      : null,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    logout: handleLogout,
    updateUser: handleUpdateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

