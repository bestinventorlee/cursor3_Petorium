"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import VideoPlayerFeed from "@/components/VideoPlayerFeed";
import VideoInteractions from "@/components/VideoInteractions";
import CommentSection from "@/components/CommentSection";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api-client";

interface Video {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  views: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    name?: string;
    bio?: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("비디오를 찾을 수 없습니다");
          } else {
            setError("비디오를 불러오는 중 오류가 발생했습니다");
          }
          return;
        }

        const data = await response.json();
        setVideo(data);
        
        // 처리 중인 비디오 확인
        const processing = data.videoUrl?.startsWith("processing://") || data.videoUrl?.startsWith("error://");
        setIsProcessing(processing);
        
        // 처리 중이면 상태 확인 시작
        if (processing) {
          checkVideoStatus(data.id);
        }
      } catch (err) {
        console.error("Error fetching video:", err);
        setError("비디오를 불러오는 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchVideo();
    }
  }, [params.id]);

  // 비디오 처리 상태 확인 및 폴링
  const checkVideoStatus = async (videoId: string) => {
    let attempts = 0;
    const maxAttempts = 120; // 최대 10분 (5초 * 120)

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}/status`);
        if (!response.ok) return;

        const data = await response.json();
        
        if (!data.isProcessing) {
          // 처리 완료 - 비디오 다시 로드
          setIsProcessing(false);
          const videoResponse = await fetch(`/api/videos/${videoId}`);
          if (videoResponse.ok) {
            const videoData = await videoResponse.json();
            setVideo(videoData);
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 5000); // 5초 후 다시 확인
        }
      } catch (error) {
        console.error("Error checking video status:", error);
      }
    };

    pollStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{error || "비디오를 찾을 수 없습니다"}</p>
          <button
            onClick={() => router.push("/feed")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            피드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isOwnVideo = user?.id === video.user.id;

  const handleDelete = async () => {
    if (!video) return;

    setIsDeleting(true);
    try {
      // api-client를 사용하여 자동으로 CSRF 토큰 포함
      const response = await api.delete(`/api/videos/${video.id}`);

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "비디오 삭제에 실패했습니다");
        return;
      }

      alert("비디오가 삭제되었습니다");
      router.push("/profile");
    } catch (err) {
      console.error("Error deleting video:", err);
      alert("비디오 삭제 중 오류가 발생했습니다");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdate = async (title: string, description: string) => {
    if (!video) return;

    try {
      // api-client를 사용하여 자동으로 CSRF 토큰 포함
      const response = await api.patch(
        `/api/videos/${video.id}`,
        { title, description }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "비디오 수정에 실패했습니다");
        return;
      }

      const updatedVideo = await response.json();
      setVideo(updatedVideo);
      setShowEditModal(false);
      alert("비디오가 수정되었습니다");
    } catch (err) {
      console.error("Error updating video:", err);
      alert("비디오 수정 중 오류가 발생했습니다");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* 뒤로가기 버튼 */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white hover:text-gray-300 transition"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="hidden sm:inline">뒤로</span>
            </button>
            {isOwnVideo && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 text-white hover:text-gray-300 transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span className="hidden sm:inline">수정</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="hidden sm:inline">삭제</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 비디오 플레이어 */}
        <div className="mb-6 flex justify-center">
          <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ maxWidth: '100%', maxHeight: '80vh', aspectRatio: '9/16' }}>
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center text-white p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
                <p className="text-lg font-medium mb-2">비디오를 처리하고 있습니다</p>
                <p className="text-sm text-gray-400">잠시만 기다려주세요...</p>
              </div>
            ) : (
              <VideoPlayerFeed
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                videoId={video.id}
                className="w-full h-full"
              />
            )}
          </div>
        </div>

        {/* 인터랙션 버튼 - 가로 배치 */}
        <div className="mb-6 flex justify-center">
          <VideoInteractions
            videoId={video.id}
            userId={video.user.id}
            username={video.user.username}
            userAvatar={video.user.avatar}
            likes={video._count.likes}
            comments={video._count.comments}
          />
        </div>

        {/* 비디오 정보 */}
        <div className="flex flex-col gap-6">
          {/* 제목 및 설명 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{video.title}</h1>
            {video.description && (
              <p className="text-gray-300 whitespace-pre-wrap">{video.description}</p>
            )}
          </div>

          {/* 사용자 정보 */}
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/user/${video.user.username}`}>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  {video.user.avatar ? (
                    <Image
                      src={video.user.avatar}
                      alt={video.user.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white">
                      {video.user.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold">@{video.user.username}</p>
                  {video.user.name && (
                    <p className="text-gray-400 text-sm">{video.user.name}</p>
                  )}
                </div>
              </div>
            </Link>
          </div>

          {/* 통계 */}
          <div className="flex items-center gap-6 text-gray-400 text-sm mb-6">
            <span>{video.views.toLocaleString()} 조회</span>
            {video.duration && (
              <span>
                {Math.floor(video.duration / 60)}:
                {(video.duration % 60).toString().padStart(2, "0")}
              </span>
            )}
            <span>{new Date(video.createdAt).toLocaleDateString("ko-KR")}</span>
          </div>

          {/* 댓글 섹션 */}
          <div className="border-t border-gray-800 pt-6">
            <CommentSection videoId={video.id} />
          </div>
        </div>
      </div>

      {/* 수정 모달 */}
      {showEditModal && video && (
        <EditVideoModal
          video={video}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdate}
        />
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

// 수정 모달 컴포넌트
function EditVideoModal({
  video,
  onClose,
  onSave,
}: {
  video: Video;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
}) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(title, description);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          비디오 수정
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              required
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              maxLength={5000}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 삭제 확인 모달 컴포넌트
function DeleteConfirmModal({
  onClose,
  onConfirm,
  isDeleting,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          비디오 삭제
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          정말로 이 비디오를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

