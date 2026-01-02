"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function SignInPage() {
  const router = useRouter();
  const { signIn: authSignIn } = useAuth();
  const { data: session, update } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 로그인 성공 후 세션이 업데이트되면 리다이렉트
  useEffect(() => {
    if (session?.user && !loading) {
      // 이미 로그인된 상태면 리다이렉트
      router.push("/");
      router.refresh();
    }
  }, [session, router, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("유효한 이메일 주소를 입력해주세요");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다");
      setLoading(false);
      return;
    }

    try {
      // 타임아웃 설정 (10초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("로그인 요청 시간이 초과되었습니다")), 10000);
      });

      const loginPromise = authSignIn(email, password);
      const result = await Promise.race([loginPromise, timeoutPromise]) as any;

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // 로그인 성공 - 세션 업데이트 및 확인
      try {
        await update();
        
        // 세션이 제대로 설정되었는지 확인
        let retryCount = 0;
        const maxRetries = 5;
        
        while (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200));
          const currentSession = await fetch('/api/auth/session').then(res => res.json()).catch(() => null);
          
          if (currentSession?.user?.id) {
            console.log("[SignIn] Session confirmed:", currentSession.user.id);
            // 세션 확인됨 - 리다이렉트
            router.push("/");
            router.refresh();
            return;
          }
          
          retryCount++;
          // 마지막 시도에서도 세션이 없으면 강제 리다이렉트
          if (retryCount >= maxRetries) {
            console.warn("[SignIn] Session not found after retries, redirecting anyway");
            router.push("/");
            router.refresh();
            return;
          }
        }
      } catch (updateError) {
        console.error("Session update error:", updateError);
        // 업데이트 실패해도 리다이렉트 시도
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || "로그인 중 오류가 발생했습니다");
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: string) => {
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch (err) {
      setError(`${provider} 로그인 중 오류가 발생했습니다`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            또는{" "}
            <Link
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              새 계정 만들기
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">
                  또는
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSocialSignIn("google")}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <span className="sr-only">Google로 로그인</span>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn("github")}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <span className="sr-only">GitHub로 로그인</span>
                GitHub
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn("apple")}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <span className="sr-only">Apple로 로그인</span>
                Apple
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
