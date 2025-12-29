"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import AdminLayout from "@/components/AdminLayout";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import Link from "next/link";

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  views: number;
  isRemoved: boolean;
  isFlagged: boolean;
  removedAt?: string;
  removedReason?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [removed, setRemoved] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");

  const fetchVideos = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (removed) params.set("removed", removed);
      if (flagged) params.set("flagged", flagged);

      const response = await fetch(`/api/admin/videos?${params}`);
      const data = await response.json();
      setVideos(data.videos);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, removed, flagged]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleRemove = async (videoId: string, reason?: string) => {
    if (!confirm("이 비디오를 제거하시겠습니까?")) return;

    try {
      const response = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, reason }),
      });

      if (response.ok) {
        fetchVideos();
      }
    } catch (error) {
      console.error("Error removing video:", error);
    }
  };

  const handleRestore = async (videoId: string) => {
    try {
      const response = await fetch(`/api/admin/videos/${videoId}/restore`, {
        method: "POST",
      });

      if (response.ok) {
        fetchVideos();
      }
    } catch (error) {
      console.error("Error restoring video:", error);
    }
  };

  const handleFlag = async (videoId: string) => {
    try {
      const response = await fetch("/api/admin/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (response.ok) {
        fetchVideos();
      }
    } catch (error) {
      console.error("Error flagging video:", error);
    }
  };

  if (loading) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">비디오 관리</h1>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="검색 (제목, 설명)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
              <select
                value={removed}
                onChange={(e) => {
                  setRemoved(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">모든 상태</option>
                <option value="false">활성</option>
                <option value="true">제거됨</option>
              </select>
              <select
                value={flagged}
                onChange={(e) => {
                  setFlagged(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">모든 상태</option>
                <option value="false">정상</option>
                <option value="true">플래그됨</option>
              </select>
            </div>
          </div>

          {/* Videos grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
              >
                {video.thumbnailUrl && (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={320}
                    height={192}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2">{video.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    @{video.user.username}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span>👁️ {video.views.toLocaleString()}</span>
                    <span>❤️ {video._count.likes}</span>
                    <span>💬 {video._count.comments}</span>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    {video.isRemoved ? (
                      <button
                        onClick={() => handleRestore(video.id)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm"
                      >
                        복원
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRemove(video.id)}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm"
                        >
                          제거
                        </button>
                        <button
                          onClick={() => handleFlag(video.id)}
                          className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded text-sm"
                        >
                          플래그
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              페이지 {page} / {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

