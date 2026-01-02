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
      
      // 1. 커스텀 로그아웃 API 호출 (서버 측 쿠키 명시적 삭제)
      try {
        console.log("[Auth] Calling custom logout API...");
        const logoutResponse = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const logoutData = await logoutResponse.json();
        console.log("[Auth] Logout API response:", logoutResponse.status, logoutData);
      } catch (err) {
        console.warn("[Auth] Logout API error:", err);
      }
      
      // 2. NextAuth signout API 호출
      try {
        console.log("[Auth] Calling NextAuth signout API...");
        const signoutResponse = await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log("[Auth] Signout API response status:", signoutResponse.status);
      } catch (err) {
        console.warn("[Auth] Signout API error:", err);
      }
      
      // 3. NextAuth signOut 함수 호출 (클라이언트 측 세션 정리)
      try {
        console.log("[Auth] Calling signOut function...");
        await signOut({ 
          redirect: false,
          callbackUrl: "/"
        });
        console.log("[Auth] SignOut function completed");
      } catch (signOutError) {
        console.warn("[Auth] SignOut function error:", signOutError);
      }
      
      // 4. 로컬 스토리지 및 세션 스토리지 정리
      if (typeof window !== "undefined") {
        console.log("[Auth] Clearing storage...");
        localStorage.removeItem("csrf-token");
        localStorage.clear();
        sessionStorage.clear();
        console.log("[Auth] Storage cleared");
      }
      
      // 5. 세션 상태 강제 초기화를 위해 페이지 완전히 새로고침
      console.log("[Auth] Redirecting to home and reloading...");
      if (typeof window !== "undefined") {
        // 쿠키 삭제가 완료되도록 약간의 지연 후 리다이렉트
        setTimeout(() => {
          // 하드 리다이렉트로 쿠키 상태 완전히 초기화
          window.location.replace("/");
        }, 500);
      }
    } catch (error) {
      console.error("[Auth] Logout error:", error);
      // 에러가 발생해도 강제로 홈으로 이동
      if (typeof window !== "undefined") {
        window.location.replace("/");
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

