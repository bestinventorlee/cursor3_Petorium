"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  username: string;
  avatar?: string;
  image?: string;
  name?: string;
  bio?: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  _count: {
    videos: number;
  };
}

export default function FollowersPage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchFollowers();
  }, [username]);

  const fetchFollowers = async (pageNum: number = 1) => {
    try {
      // 먼저 사용자 ID 가져오기
      const userResponse = await fetch(`/api/users/profile/${username}`);
      if (!userResponse.ok) {
        setLoading(false);
        return;
      }

      const userData = await userResponse.json();
      const userId = userData.id;

      const response = await fetch(
        `/api/users/by-id/${userId}/followers?page=${pageNum}&limit=20`
      );
      const data = await response.json();

      if (data.followers) {
        if (pageNum === 1) {
          setFollowers(data.followers);
        } else {
          setFollowers((prev) => [...prev, ...data.followers]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/users/by-id/${userId}/follow`, {
        method: currentState ? "DELETE" : "POST",
      });

      if (response.ok) {
        setFollowers((prev) =>
          prev.map((f) =>
            f.id === userId ? { ...f, isFollowing: !currentState } : f
          )
        );
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">팔로워</h1>
      <div className="space-y-4">
        {followers.map((follower) => (
          <div
            key={follower.id}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
          >
            <Link
              href={`/user/${follower.username}`}
              className="flex items-center space-x-4 flex-1"
            >
              {follower.avatar ? (
                <Image
                  src={follower.avatar}
                  alt={follower.username}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-xl font-medium">
                    {follower.username[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-semibold">{follower.username}</h3>
                {follower.name && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {follower.name}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  {follower._count.videos} 비디오 · {follower.followers} 팔로워
                </p>
              </div>
            </Link>
            {user && user.id !== follower.id && (
              <button
                onClick={() => handleFollow(follower.id, follower.isFollowing)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  follower.isFollowing
                    ? "bg-gray-200 text-gray-800"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {follower.isFollowing ? "팔로잉" : "팔로우"}
              </button>
            )}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchFollowers(nextPage);
          }}
          className="w-full mt-4 py-2 text-center text-blue-600 hover:bg-blue-50 rounded-md"
        >
          더 보기
        </button>
      )}
    </div>
  );
}

