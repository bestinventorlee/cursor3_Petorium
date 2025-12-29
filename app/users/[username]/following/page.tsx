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

export default function FollowingPage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchFollowing();
  }, [username]);

  const fetchFollowing = async (pageNum: number = 1) => {
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
        `/api/users/by-id/${userId}/following?page=${pageNum}&limit=20`
      );
      const data = await response.json();

      if (data.following) {
        if (pageNum === 1) {
          setFollowing(data.following);
        } else {
          setFollowing((prev) => [...prev, ...data.following]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/by-id/${userId}/follow`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFollowing((prev) => prev.filter((f) => f.id !== userId));
      }
    } catch (error) {
      console.error("Error unfollowing:", error);
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
      <h1 className="text-2xl font-bold mb-6">팔로잉</h1>
      <div className="space-y-4">
        {following.map((userItem) => (
          <div
            key={userItem.id}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
          >
            <Link
              href={`/user/${userItem.username}`}
              className="flex items-center space-x-4 flex-1"
            >
              {userItem.avatar ? (
                <Image
                  src={userItem.avatar}
                  alt={userItem.username}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-xl font-medium">
                    {userItem.username[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-semibold">{userItem.username}</h3>
                {userItem.name && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userItem.name}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  {userItem._count.videos} 비디오 · {userItem.followers} 팔로워
                </p>
              </div>
            </Link>
            {user && user.id !== userItem.id && (
              <button
                onClick={() => handleUnfollow(userItem.id)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-medium hover:bg-gray-300 transition"
              >
                팔로잉
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
            fetchFollowing(nextPage);
          }}
          className="w-full mt-4 py-2 text-center text-blue-600 hover:bg-blue-50 rounded-md"
        >
          더 보기
        </button>
      )}
    </div>
  );
}

