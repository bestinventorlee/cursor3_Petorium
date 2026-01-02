"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Image from "next/image";
import VideoGrid from "@/components/VideoGrid";

type TabType = "settings" | "videos" | "liked" | "saved";

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl: string;
  views: number;
  duration?: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    image?: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    avatar: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("videos");
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 인증 확인 및 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin?callbackUrl=/profile");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchVideos = useCallback(async (pageNum: number = 1) => {
    if (!profile?.username) return;

    setVideosLoading(true);
    try {
      let endpoint = "";
      switch (activeTab) {
        case "videos":
          endpoint = `/api/users/${profile.username}/videos`;
          break;
        case "liked":
          endpoint = `/api/users/${profile.username}/liked`;
          break;
        case "saved":
          endpoint = `/api/users/${profile.username}/saved`;
          break;
        default:
          return;
      }

      const response = await fetch(`${endpoint}?page=${pageNum}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        if (pageNum === 1) {
          setVideos(data.videos || []);
        } else {
          setVideos((prev) => [...prev, ...(data.videos || [])]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setPage(pageNum);
      } else if (response.status === 403) {
        setVideos([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setVideosLoading(false);
    }
  }, [profile?.username, activeTab]);

  useEffect(() => {
    if (profile && activeTab !== "settings") {
      setPage(1);
      setVideos([]);
      fetchVideos(1);
    }
  }, [profile, activeTab, fetchVideos]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/auth/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "프로필 업데이트 중 오류가 발생했습니다");
        return;
      }

      setProfile(data);
      setSuccess("프로필이 성공적으로 업데이트되었습니다");
      setEditing(false);
      // 세션 업데이트
      window.location.reload();
    } catch (err) {
      setError("프로필 업데이트 중 오류가 발생했습니다");
    }
  };


  const handleLoadMore = () => {
    if (!videosLoading && hasMore) {
      fetchVideos(page + 1);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    setHasMore(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // 리다이렉트 중
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* 프로필 헤더 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">내 프로필</h1>
              {activeTab === "settings" && (
                <button
                  onClick={() => setEditing(!editing)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editing ? "취소" : "편집"}
                </button>
              )}
            </div>

            {/* 프로필 정보 */}
            {!editing && (
              <div className="flex items-center space-x-4 mb-6">
                {profile?.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={profile.username}
                    width={100}
                    height={100}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-2xl font-medium">
                      {profile?.username?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">
                    {profile?.name || profile?.username}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    @{profile?.username}
                  </p>
                  {profile?.bio && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 통계 */}
            {!editing && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{profile?._count?.videos || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">비디오</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{profile?.followers || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">팔로워</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{profile?.following || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">팔로잉</div>
                </div>
              </div>
            )}
          </div>

          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => handleTabChange("videos")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === "videos"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                비디오 ({profile?._count?.videos || 0})
              </button>
              <button
                onClick={() => handleTabChange("liked")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === "liked"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                좋아요한 비디오
              </button>
              <button
                onClick={() => handleTabChange("saved")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === "saved"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                저장한 비디오
              </button>
              <button
                onClick={() => handleTabChange("settings")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === "settings"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                설정
              </button>
            </nav>
          </div>

          {/* 설정 탭 */}
          {activeTab === "settings" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">

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

              {editing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      아바타 URL
                    </label>
                    <input
                      type="url"
                      value={formData.avatar}
                      onChange={(e) =>
                        setFormData({ ...formData, avatar: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    저장
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">이메일</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {profile?.email}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={async () => {
                        if (confirm("정말 로그아웃하시겠습니까?")) {
                          await logout();
                          router.push("/");
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 비디오 탭 */}
          {activeTab !== "settings" && (
            <VideoGrid
              videos={videos}
              loading={videosLoading}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

