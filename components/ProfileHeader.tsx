"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import EditProfileModal from "./EditProfileModal";
import PinchZoomImage from "./PinchZoomImage";
import { withBasePath } from "@/lib/base-path";

interface ProfileHeaderProps {
  user: {
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
  };
  isFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export default function ProfileHeader({
  user,
  isFollowing = false,
  onFollowChange,
}: ProfileHeaderProps) {
  const { user: currentUser, logout } = useAuth();
  const [isFollowingState, setIsFollowingState] = useState(isFollowing);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isOwnProfile = currentUser?.id === user.id;

  const handleFollow = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    const newFollowingState = !isFollowingState;
    setIsFollowingState(newFollowingState);

    try {
      const response = await fetch(withBasePath(`/api/users/by-id/${user.id}/follow`), {
        method: newFollowingState ? "POST" : "DELETE",
      });

      if (!response.ok) {
        setIsFollowingState(!newFollowingState);
      } else {
        if (onFollowChange) {
          onFollowChange(newFollowingState);
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      setIsFollowingState(!newFollowingState);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          {/* 아바타 */}
          <div className="relative">
            {user.avatar || user.image ? (
              <PinchZoomImage
                src={user.avatar || user.image!}
                alt={user.username}
                width={120}
                height={120}
                className="rounded-full border-4 border-gray-200 dark:border-gray-700 cursor-pointer"
              />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
                <span className="text-4xl font-medium text-gray-700 dark:text-gray-300">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* 사용자 정보 */}
          <div className="flex-1">
            <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <h1 className="text-2xl font-bold">
                {user.name || user.username}
              </h1>
              {isOwnProfile ? (
                <div className="flex flex-wrap items-center gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEditModal(true)}
                    className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    프로필 편집
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm("로그아웃하시겠습니까?")
                      ) {
                        return;
                      }
                      void logout();
                    }}
                    className="rounded-md border border-[#FF6B6B] px-4 py-2 text-[#FF6B6B] transition hover:bg-[#FF6B6B]/10"
                  >
                    로그아웃
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFollow}
                  disabled={isLoading}
                  className={`rounded-md px-4 py-2 font-medium transition ${
                    isFollowingState
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isFollowingState ? "팔로잉" : "팔로우"}
                </motion.button>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              @{user.username}
            </p>
            {user.bio && (
              <p className="text-gray-700 dark:text-gray-300 mb-4">{user.bio}</p>
            )}

            {/* 통계 */}
            <div className="flex space-x-6">
              <Link
                href={`/user/${user.username}`}
                className="hover:underline"
              >
                <span className="font-semibold">{user._count.videos}</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  비디오
                </span>
              </Link>
              <Link
                href={`/users/${user.username}/followers`}
                className="hover:underline"
              >
                <span className="font-semibold">{user.followers}</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  팔로워
                </span>
              </Link>
              <Link
                href={`/users/${user.username}/following`}
                className="hover:underline"
              >
                <span className="font-semibold">{user.following}</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  팔로잉
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 프로필 편집 모달 */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={user}
        />
      )}
    </>
  );
}

