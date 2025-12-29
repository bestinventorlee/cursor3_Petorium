"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import VideoPlayerFeed from "./VideoPlayerFeed";
import VideoInteractions from "./VideoInteractions";

interface Video {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  views: number;
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

interface VideoFeedProps {
  initialVideos?: Video[];
}

export default function VideoFeed({ initialVideos = [] }: VideoFeedProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 다음 비디오 로드 (커서 기반)
  const loadMoreVideos = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const url = nextCursor
        ? `/api/feed/for-you?cursor=${encodeURIComponent(nextCursor)}&limit=15`
        : `/api/feed/for-you?limit=15`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.videos && data.videos.length > 0) {
        setVideos((prev) => [...prev, ...data.videos]);
        setNextCursor(data.pagination.cursor);
        setHasMore(data.pagination.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, hasMore]);

  // 스크롤 이벤트 핸들러 (스냅 스크롤)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const containerHeight = container.clientHeight;
      const scrollTop = container.scrollTop;
      const newIndex = Math.round(scrollTop / containerHeight);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentIndex(newIndex);

        // 다음 비디오 프리로드 (마지막에서 3번째 비디오일 때)
        if (newIndex >= videos.length - 3 && hasMore && !loading) {
          loadMoreVideos();
        }
      }

      // 스크롤이 멈춘 후 스냅
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const targetScroll = newIndex * containerHeight;
        container.scrollTo({
          top: targetScroll,
          behavior: "smooth",
        });
      }, 150);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentIndex, videos.length, hasMore, loadMoreVideos]);

  // 휠 이벤트로 스냅 스크롤
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const delta = e.deltaY;
      const containerHeight = container.clientHeight;

      if (delta > 0 && currentIndex < videos.length - 1) {
        // 아래로 스크롤
        setCurrentIndex((prev) => prev + 1);
        container.scrollTo({
          top: (currentIndex + 1) * containerHeight,
          behavior: "smooth",
        });
      } else if (delta < 0 && currentIndex > 0) {
        // 위로 스크롤
        setCurrentIndex((prev) => prev - 1);
        container.scrollTo({
          top: (currentIndex - 1) * containerHeight,
          behavior: "smooth",
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [currentIndex, videos.length]);

  const handleDoubleTap = useCallback((videoId: string) => {
    // 좋아요 토글
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      // VideoInteractions에서 처리됨
    }
  }, [videos]);

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">비디오가 없습니다</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollSnapType: "y mandatory" }}
    >
      {videos.map((video, index) => (
        <VideoFeedItem
          key={video.id}
          video={video}
          index={index}
          currentIndex={currentIndex}
          onDoubleTap={() => handleDoubleTap(video.id)}
        />
      ))}

      {/* 로딩 인디케이터 */}
      {loading && (
        <div className="h-screen flex items-center justify-center snap-start">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}

interface VideoFeedItemProps {
  video: Video;
  index: number;
  currentIndex: number;
  onDoubleTap: () => void;
}

function VideoFeedItem({
  video,
  index,
  currentIndex,
  onDoubleTap,
}: VideoFeedItemProps) {
  const isActive = index === currentIndex;
  const [isLiked, setIsLiked] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);

  // 좋아요 및 팔로우 상태 확인
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [likeResponse, followResponse] = await Promise.all([
          fetch(`/api/videos/${video.id}/like`),
          fetch(`/api/users/by-id/${video.user.id}/follow`),
        ]);

        if (likeResponse.ok) {
          const likeData = await likeResponse.json();
          setIsLiked(likeData.liked);
        }

        if (followResponse.ok) {
          const followData = await followResponse.json();
          setIsFollowing(followData.isFollowing);
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    if (isActive) {
      checkStatus();
    }
  }, [video.id, video.user.id, isActive]);

  return (
    <div
      className="h-screen w-full snap-start relative bg-black flex items-center justify-center"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="relative w-full h-full">
        {/* 비디오 플레이어 */}
        <VideoPlayerFeed
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          videoId={video.id}
          onDoubleTap={onDoubleTap}
          className="h-full w-full"
        />

        {/* 비디오 정보 및 인터랙션 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-end justify-between">
            {/* 왼쪽: 비디오 정보 */}
            <div className="flex-1 pr-4">
              <Link
                href={`/user/${video.user.username}`}
                className="flex items-center space-x-2 mb-2"
              >
                <span className="text-white font-semibold">
                  @{video.user.username}
                </span>
              </Link>
              <p className="text-white text-sm mb-2 line-clamp-2">
                {video.description || video.title}
              </p>
              <div className="flex items-center space-x-4 text-white/80 text-xs">
                <span>{video.views.toLocaleString()} 조회</span>
                {video.duration && (
                  <span>
                    {Math.floor(video.duration / 60)}:
                    {(video.duration % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>
            </div>

            {/* 오른쪽: 인터랙션 버튼 */}
            <VideoInteractions
              videoId={video.id}
              userId={video.user.id}
              username={video.user.username}
              userAvatar={video.user.avatar}
              likes={video._count?.likes || 0}
              comments={video._count?.comments || 0}
              isLiked={isLiked}
              isFollowing={isFollowing}
              onLike={(liked) => setIsLiked(liked)}
              onFollow={(following) => setIsFollowing(following)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

