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
      basePath="/api/auth" // NextAuth API 경로 명시
    >
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (status !== "loading") {
      setLoading(false);
      // 세션이 없으면 명시적으로 로그
      if (status === "unauthenticated") {
        console.log("[AuthContext] User is unauthenticated");
        setIsLoggingOut(false);
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
      setIsLoggingOut(true);
      console.log("[Auth] Starting logout process...");
      
      // 1. 스토리지 먼저 정리
      if (typeof window !== "undefined") {
        console.log("[Auth] Clearing storage...");
        localStorage.removeItem("csrf-token");
        localStorage.clear();
        sessionStorage.clear();
        console.log("[Auth] Storage cleared");
      }
      
      // 2. 커스텀 signout API 호출 (서버 측 쿠키 삭제가 가장 중요)
      try {
        console.log("[Auth] Calling custom signout API...");
        const signoutResponse = await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        console.log("[Auth] Signout API response status:", signoutResponse.status);
        
        // Set-Cookie 헤더 확인
        const setCookieHeaders = signoutResponse.headers.getSetCookie();
        console.log("[Auth] Signout API Set-Cookie headers:", setCookieHeaders.length);
        
        if (!signoutResponse.ok) {
          console.warn(`[Auth] Signout API failed: ${signoutResponse.status}`);
        }
      } catch (apiError) {
        console.error("[Auth] Signout API error:", apiError);
      }
      
      // 2-1. NextAuth의 기본 signout API도 호출 (이중 확인)
      try {
        console.log("[Auth] Calling NextAuth default signout...");
        await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
        }).catch(() => {
          // NextAuth의 기본 signout이 없을 수도 있음
        });
      } catch (err) {
        // 무시
      }
      
      // 3. 커스텀 로그아웃 API 호출 (추가 쿠키 삭제)
      try {
        console.log("[Auth] Calling custom logout API...");
        const logoutResponse = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log("[Auth] Custom logout API response:", logoutResponse.status);
      } catch (err) {
        console.warn("[Auth] Custom logout API error:", err);
      }
      
      // 4. NextAuth signOut 함수 호출 (클라이언트 측 세션 정리)
      try {
        console.log("[Auth] Calling signOut function...");
        await signOut({ 
          redirect: false,
          callbackUrl: "/auth/signin"
        });
        console.log("[Auth] SignOut function completed");
      } catch (signOutError) {
        console.error("[Auth] SignOut function error:", signOutError);
      }
      
      // 5. 세션 상태를 강제로 초기화하기 위해 완전히 새로운 페이지 로드
      console.log("[Auth] Forcing complete page reload...");
      if (typeof window !== "undefined") {
        // 쿠키 삭제가 완료되도록 충분한 지연 후 완전히 새 페이지 로드
        setTimeout(() => {
          // window.location.replace로 히스토리에서 제거하고 완전히 새 페이지 로드
          // 쿼리 파라미터로 캐시 방지
          const timestamp = Date.now();
          // 완전히 새로운 페이지로 이동하여 세션 상태 초기화
          window.location.href = `/auth/signin?logout=true&t=${timestamp}&nocache=${Math.random()}`;
        }, 1000);
      }
    } catch (error) {
      console.error("[Auth] Logout error:", error);
      setIsLoggingOut(false);
      // 에러가 발생해도 강제로 로그인 페이지로 이동
      if (typeof window !== "undefined") {
        window.location.replace("/auth/signin?logout=true");
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

