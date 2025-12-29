"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ShareModal from "./ShareModal";
import CommentModal from "./CommentModal";

interface VideoInteractionsProps {
  videoId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  isFollowing?: boolean;
  onLike?: (liked: boolean) => void;
  onFollow?: (following: boolean) => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  layout?: "vertical" | "horizontal"; // 피드용 세로, 상세 페이지용 가로
  onOpenCommentModal?: (videoId: string) => void;
  onOpenShareModal?: (videoId: string) => void;
}

export default function VideoInteractions({
  videoId,
  userId,
  username,
  userAvatar,
  likes: initialLikes,
  comments: initialComments,
  isLiked: initialIsLiked = false,
  isFollowing: initialIsFollowing = false,
  onLike,
  onFollow,
  onComment,
  onShare,
  onSave,
  layout = "vertical", // 기본값은 세로 (피드용)
  onOpenCommentModal,
  onOpenShareModal,
}: VideoInteractionsProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // videoId나 initialLikes, initialComments가 변경되면 상태 업데이트
  useEffect(() => {
    setLikes(initialLikes);
    setIsLiked(initialIsLiked);
    setIsFollowing(initialIsFollowing);
  }, [videoId, initialLikes, initialIsLiked, initialIsFollowing]);

  // videoId가 변경되면 모달 상태 리셋
  useEffect(() => {
    setShowCommentModal(false);
    setShowShareModal(false);
    setIsSaved(false);
  }, [videoId]);

  const handleLike = async () => {
    if (!user) return;

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikes((prev) => (newLikedState ? prev + 1 : prev - 1));

    try {
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        // 롤백
        setIsLiked(!newLikedState);
        setLikes((prev) => (newLikedState ? prev - 1 : prev + 1));
      } else {
        if (onLike) {
          onLike(newLikedState);
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // 롤백
      setIsLiked(!newLikedState);
      setLikes((prev) => (newLikedState ? prev - 1 : prev + 1));
    }
  };

  const handleFollow = async () => {
    if (!user || user.id === userId) return;

    setIsLoading(true);
    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState); // Optimistic update

    try {
      const response = await fetch(`/api/users/by-id/${userId}/follow`, {
        method: newFollowingState ? "POST" : "DELETE",
      });

      if (!response.ok) {
        // Rollback on error
        setIsFollowing(!newFollowingState);
      } else {
        if (onFollow) {
          onFollow(newFollowingState);
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Rollback on error
      setIsFollowing(!newFollowingState);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
    if (onShare) {
      onShare();
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    try {
      const response = await fetch(`/api/videos/${videoId}/save`, {
        method: "POST",
      });

      if (!response.ok) {
        // 롤백
        setIsSaved(!newSavedState);
      } else {
        if (onSave) {
          onSave();
        }
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      // 롤백
      setIsSaved(!newSavedState);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const buttonVariants = {
    hover: { scale: 1.1 },
    tap: { scale: 0.9 },
  };

  return (
    <div className="flex flex-col items-end space-y-6">
      {/* 사용자 아바타 및 팔로우 */}
      <div className="flex flex-col items-center space-y-2">
        <Link href={`/user/${username}`}>
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={username}
              width={48}
              height={48}
              className="rounded-full border-2 border-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center border-2 border-white">
              <span className="text-lg font-medium text-gray-700">
                {username[0].toUpperCase()}
              </span>
            </div>
          )}
        </Link>
        {user && user.id !== userId && (
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleFollow}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isFollowing
                ? "bg-white text-black"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            {isFollowing ? "팔로잉" : "팔로우"}
          </motion.button>
        )}
      </div>

      {/* 좋아요 */}
      <div className="flex flex-col items-center space-y-1">
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={handleLike}
          className="flex flex-col items-center space-y-1"
        >
          <motion.div
            animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <svg
              className={`w-8 h-8 ${isLiked ? "text-red-500 fill-current" : "text-white"}`}
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </motion.div>
          <motion.span
            key={likes}
            initial={{ scale: 1.2, color: "#ef4444" }}
            animate={{ scale: 1, color: "#ffffff" }}
            transition={{ duration: 0.3 }}
            className="text-white text-xs font-medium"
          >
            {formatCount(likes)}
          </motion.span>
        </motion.button>
      </div>

      {/* 댓글 */}
      <div className="flex flex-col items-center space-y-1">
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onOpenCommentModal) {
              onOpenCommentModal(videoId);
            } else {
              setShowCommentModal(true);
            }
            if (onComment) {
              onComment();
            }
          }}
          className="flex flex-col items-center space-y-1 relative z-10"
        >
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-white text-xs font-medium">
            {formatCount(initialComments)}
          </span>
        </motion.button>
      </div>

      {/* 공유 */}
      <div className="flex flex-col items-center space-y-1">
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onOpenShareModal) {
              onOpenShareModal(videoId);
            } else {
              handleShare();
            }
          }}
          className="flex flex-col items-center space-y-1 relative z-10"
        >
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span className="text-white text-xs font-medium">공유</span>
        </motion.button>
      </div>

      {/* 저장 */}
      <div className="flex flex-col items-center space-y-1">
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={handleSave}
          className="flex flex-col items-center space-y-1"
        >
          <svg
            className={`w-8 h-8 ${isSaved ? "text-yellow-500 fill-current" : "text-white"}`}
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <span className="text-white text-xs font-medium">저장</span>
        </motion.button>
      </div>

      {/* 공유 모달 - onOpenShareModal이 없을 때만 내부에서 관리 */}
      {!onOpenShareModal && showShareModal && (
        <ShareModal
          key={`share-${videoId}`}
          videoId={videoId}
          videoTitle={`@${username}의 비디오`}
          videoThumbnail={undefined}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* 댓글 모달 - onOpenCommentModal이 없을 때만 내부에서 관리 */}
      {!onOpenCommentModal && showCommentModal && (
        <CommentModal
          key={`comment-${videoId}`}
          videoId={videoId}
          isOpen={showCommentModal}
          onClose={() => setShowCommentModal(false)}
        />
      )}
    </div>
  );
}

