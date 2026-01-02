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
    <SessionProvider>
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
    }
  }, [status]);

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
    await signOut({ redirect: false });
    router.push("/");
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

