"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  videoUrl: string | null;
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

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function VideoGrid({
  videos,
  loading = false,
  onLoadMore,
  hasMore = false,
}: VideoGridProps) {
  const formatCount = (count: number) => {
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

  if (loading && videos.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-full aspect-[9/16] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">비디오가 없습니다</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {videos.map((video, index) => {
          const isProcessing = !video.videoUrl || video.videoUrl.startsWith("processing://");
          
          return (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {!isProcessing ? (
                <Link href={`/video/${video.id}`}>
                  <div className="relative w-full bg-black rounded-lg overflow-hidden group cursor-pointer aspect-[9/16]">
                    {/* 썸네일 */}
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        priority={index < 4}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <svg
                          className="w-16 h-16 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                {/* 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>{formatCount(video.views)} 조회</span>
                      {video.duration && (
                        <span>{formatDuration(video.duration)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 메타데이터 오버레이 */}
                <div className="absolute top-2 right-2 flex items-center space-x-2">
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 flex items-center space-x-1">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                    <span className="text-white text-xs">
                      {formatCount(video._count.likes)}
                    </span>
                  </div>
                </div>

                    {/* 재생 아이콘 */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden aspect-[9/16] flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-sm font-medium">업로드 중...</p>
                    <p className="text-white/60 text-xs mt-2">{video.title}</p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* 더 보기 버튼 */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "로딩 중..." : "더 보기"}
          </button>
        </div>
      )}
    </>
  );
}

