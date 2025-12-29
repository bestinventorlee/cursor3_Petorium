"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("이메일을 입력해주세요");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "비밀번호 재설정 요청 중 오류가 발생했습니다");
        setLoading(false);
        return;
      }

      setSuccess(true);
      // 개발 환경에서 토큰 표시
      if (data.resetToken) {
        console.log("Reset Token:", data.resetToken);
        console.log("Reset URL:", data.resetUrl);
      }
    } catch (err) {
      setError("비밀번호 재설정 요청 중 오류가 발생했습니다");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            비밀번호 재설정
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              이메일이 전송되었습니다. 이메일을 확인해주세요.
            </div>
          )}
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
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={success}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || success}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "전송 중..." : success ? "전송 완료" : "재설정 링크 전송"}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

