"use client";

import { useState } from "react";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setDevResetUrl(null);
    setMessage("");

    if (!email) {
      setError("이메일을 입력해주세요");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(withBasePath("/api/auth/forgot-password"), {
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
      setMessage(
        typeof data.message === "string"
          ? data.message
          : "요청하신 이메일로 안내를 보냈습니다. 메일함을 확인해 주세요."
      );
      if (typeof data.resetUrl === "string") {
        setDevResetUrl(data.resetUrl);
      }
    } catch {
      setError("비밀번호 재설정 요청 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
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
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="space-y-3 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">
              <p>{message}</p>
              {devResetUrl && (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
                  <p className="mb-2 font-medium">개발 환경 전용 링크</p>
                  <a
                    href={devResetUrl}
                    className="break-all text-[#FF6B6B] underline"
                  >
                    {devResetUrl}
                  </a>
                </div>
              )}
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
              className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none focus:ring-[#FF6B6B] sm:text-sm"
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
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-[#FF6B6B] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff8585] focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "전송 중..." : success ? "전송 완료" : "재설정 링크 전송"}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-[#FF6B6B] hover:underline"
            >
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
