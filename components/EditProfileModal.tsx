"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    name?: string;
    avatar?: string;
    image?: string;
    bio?: string;
  };
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
}: EditProfileModalProps) {
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user.name || "",
    username: user.username || "",
    bio: user.bio || "",
    avatar: user.avatar || user.image || "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.avatar || user.image || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        bio: user.bio || "",
        avatar: user.avatar || user.image || "",
      });
      setAvatarPreview(user.avatar || user.image || null);
      setError("");
      setSuccess("");
    }
  }, [isOpen, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 확인 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("이미지 크기는 5MB 이하여야 합니다");
        return;
      }

      // 이미지 미리보기
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // TODO: 실제로는 S3/R2에 업로드하고 URL을 받아와야 함
      // 지금은 임시로 base64 사용
      setFormData({ ...formData, avatar: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // 아바타 업로드 (base64 또는 URL)
      let avatarUrl = formData.avatar;
      if (avatarPreview && avatarPreview.startsWith("data:")) {
        // TODO: 실제 업로드 로직 구현
        // 지금은 임시로 base64 사용하지 않음
        avatarUrl = user.avatar || user.image || "";
      }

      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          avatar: avatarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "프로필 업데이트 중 오류가 발생했습니다" }));
        setError(errorData.error || "프로필 업데이트 중 오류가 발생했습니다");
        return;
      }

      const data = await response.json();

      setSuccess("프로필이 성공적으로 업데이트되었습니다");
      
      // 사용자 정보 업데이트
      if (updateUser) {
        updateUser(data);
      }

      // 1초 후 모달 닫기
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError("프로필 업데이트 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 배경 오버레이 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* 모달 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">프로필 편집</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 아바타 */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Avatar preview"
                      width={120}
                      height={120}
                      className="rounded-full border-4 border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
                      <span className="text-4xl font-medium text-gray-700 dark:text-gray-300">
                        {formData.username[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                    사진 변경
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    value={formData.avatar}
                    onChange={(e) => {
                      setFormData({ ...formData, avatar: e.target.value });
                      setAvatarPreview(e.target.value || null);
                    }}
                    placeholder="또는 이미지 URL 입력"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm w-full max-w-xs"
                  />
                </div>
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 사용자명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  사용자명
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  pattern="[a-zA-Z0-9_]+"
                  minLength={3}
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  영문, 숫자, 언더스코어만 사용 가능 (3-20자)
                </p>
              </div>

              {/* 바이오 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  소개
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.bio.length}/500
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

