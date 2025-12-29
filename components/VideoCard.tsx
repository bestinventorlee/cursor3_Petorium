"use client";

import Image from "next/image";
import Link from "next/link";
import VideoPlayer from "./VideoPlayer";

interface VideoCardProps {
  id: string;
  title: string;
  description?: string;
  videoUrl: string | null;
  thumbnailUrl?: string | null;
  user: {
    id: string;
    username: string;
    image?: string;
  };
  views: number;
  likes: number;
  comments: number;
  duration?: number;
  processing?: boolean; // 처리 중 플래그
}

export default function VideoCard({
  id,
  title,
  description,
  videoUrl,
  thumbnailUrl,
  user,
  views,
  likes,
  comments,
  duration,
  processing = false,
}: VideoCardProps) {
  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isProcessing = processing || !videoUrl || videoUrl.startsWith("processing://");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {!isProcessing ? (
        <Link href={`/video/${id}`}>
          <div className="relative aspect-video bg-black">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={title}
                fill
                className="object-cover"
              />
            ) : (
              <VideoPlayer
                src={videoUrl}
                autoPlay={false}
                loop={false}
                muted={true}
                className="aspect-video"
              />
            )}
            {duration && (
              <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                {formatDuration(duration)}
              </div>
            )}
          </div>
        </Link>
      ) : (
        <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-sm font-medium">업로드 중...</p>
          </div>
        </div>
      )}
      <div className="p-4">
        <Link href={`/video/${id}`}>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-blue-600 transition">
            {title}
          </h3>
        </Link>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Link
            href={`/user/${user.username}`}
            className="flex items-center space-x-2 hover:opacity-80 transition"
          >
            {user.image ? (
              <Image
                src={user.image}
                alt={user.username}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm font-medium">{user.username}</span>
          </Link>
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>{formatViews(views)} 조회</span>
            <span>{formatViews(likes)} 좋아요</span>
            <span>{formatViews(comments)} 댓글</span>
          </div>
        </div>
      </div>
    </div>
  );
}

