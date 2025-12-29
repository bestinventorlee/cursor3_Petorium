"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import VideoUpload from "@/components/VideoUpload";

export default function UploadPage() {
  const router = useRouter();
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);

  const handleUploadComplete = (videoId: string) => {
    setUploadedVideoId(videoId);
    setUploadSuccess(true);
    
    // 3초 후 비디오 페이지로 이동
    setTimeout(() => {
      router.push(`/video/${videoId}`);
    }, 3000);
  };

  const handleUploadError = (error: string) => {
    console.error("Upload error:", error);
    // 에러는 VideoUpload 컴포넌트에서 표시됨
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              비디오 업로드
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              짧은 비디오를 업로드하여 공유하세요 (15-60초, 최대 100MB)
            </p>
          </div>

          {uploadSuccess && uploadedVideoId && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium">업로드가 완료되었습니다!</p>
                  <p className="text-sm">
                    비디오 페이지로 이동합니다...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <VideoUpload
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
          </div>

          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              업로드 가이드
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>지원 형식: MP4, MOV, AVI</li>
              <li>최대 파일 크기: 100MB</li>
              <li>비디오 길이: 15-60초</li>
              <li>권장 해상도: 1280x720 (720p) 이상</li>
              <li>비디오는 자동으로 압축되고 최적화됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

