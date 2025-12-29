"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProfileHeader from "@/components/ProfileHeader";
import VideoGrid from "@/components/VideoGrid";

type TabType = "videos" | "liked" | "saved";

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

interface User {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
  image?: string;
  bio?: string;
  followers: number;
  following: number;
  _count: {
    videos: number;
    likes: number;
    comments: number;
  };
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("videos");
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [username]);

  useEffect(() => {
    if (user) {
      checkFollowStatus();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setPage(1);
      setVideos([]);
      fetchVideos(1);
    }
  }, [user, activeTab]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${username}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else if (response.status === 404) {
        // 사용자를 찾을 수 없음
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser || !user || currentUser.id === user.id) return;

    try {
      const response = await fetch(`/api/users/by-id/${user.id}/follow`);
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const fetchVideos = async (pageNum: number = 1) => {
    if (!user) return;

    setVideosLoading(true);
    try {
      let endpoint = "";
      switch (activeTab) {
        case "videos":
          endpoint = `/api/users/${username}/videos`;
          break;
        case "liked":
          endpoint = `/api/users/${username}/liked`;
          break;
        case "saved":
          // TODO: 저장한 비디오 API 구현
          endpoint = `/api/users/${username}/saved`;
          break;
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
        // 권한 없음 (좋아요한 비디오는 본인만 볼 수 있음)
        setVideos([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setVideosLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">사용자를 찾을 수 없습니다</h1>
          <p className="text-gray-600 dark:text-gray-400">
            존재하지 않는 사용자입니다
          </p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* 프로필 헤더 */}
        <ProfileHeader
          user={user}
          isFollowing={isFollowing}
          onFollowChange={setIsFollowing}
        />

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
              비디오 ({user._count.videos})
            </button>
            {isOwnProfile && (
              <>
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
              </>
            )}
          </nav>
        </div>

        {/* 비디오 그리드 */}
        <VideoGrid
          videos={videos}
          loading={videosLoading}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}

