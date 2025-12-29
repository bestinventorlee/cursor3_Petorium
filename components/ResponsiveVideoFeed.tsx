"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MobileVideoPlayer from "./MobileVideoPlayer";
import VideoPlayerFeed from "./VideoPlayerFeed";
import VideoInteractions from "./VideoInteractions";
import CommentModal from "./CommentModal";
import ShareModal from "./ShareModal";
import Link from "next/link";

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
    image?: string;
  };
  _count?: {
    likes: number;
    comments: number;
  };
  metrics?: {
    likes: number;
    comments: number;
    views: number;
  };
}

interface ResponsiveVideoFeedProps {
  initialVideos?: Video[];
}

export default function ResponsiveVideoFeed({
  initialVideos = [],
}: ResponsiveVideoFeedProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);
  const [openCommentModalVideoId, setOpenCommentModalVideoId] = useState<string | null>(null);
  const [openShareModalVideoId, setOpenShareModalVideoId] = useState<string | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadMoreVideos = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const url = nextCursor
        ? `/api/feed/for-you?cursor=${encodeURIComponent(nextCursor)}&limit=15`
        : `/api/feed/for-you?limit=15`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }
      const data = await response.json();

      if (data.videos && data.videos.length > 0) {
        setVideos((prev) => [...prev, ...data.videos]);
        setNextCursor(data.pagination?.cursor || null);
        setHasMore(data.pagination?.hasMore !== false);
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

  // 초기 비디오 로드 (initialVideos가 비어있을 때)
  useEffect(() => {
    if (!initialLoadRef.current && videos.length === 0 && !loading) {
      initialLoadRef.current = true;
      loadMoreVideos();
    }
  }, [videos.length, loading, loadMoreVideos]);

  const handleSwipeUp = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex < videos.length - 1) {
        const newIndex = prevIndex + 1;
        // Preload next video (남은 비디오가 3개 이하일 때)
        if (newIndex >= videos.length - 3 && hasMore && !loading) {
          loadMoreVideos();
        }
        return newIndex;
      }
      return prevIndex;
    });
  }, [videos.length, hasMore, loading, loadMoreVideos]);

  const handleSwipeDown = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex > 0) {
        return prevIndex - 1;
      }
      return prevIndex;
    });
  }, []);

  // 모바일 뷰에서 마우스 휠 스크롤 처리
  useEffect(() => {
    if (!isMobile || !containerRef.current) return;

    const container = containerRef.current;
    let accumulatedDelta = 0;
    let wheelTimeout: NodeJS.Timeout | null = null;
    const SCROLL_THRESHOLD = 100; // 100px 누적 시 비디오 변경
    const RESET_TIMEOUT = 200; // 200ms 후 누적값 리셋

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      accumulatedDelta += e.deltaY;

      // 휠 이벤트 지연 처리 (스크롤이 끝난 후 처리)
      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
      }

      wheelTimeout = setTimeout(() => {
        if (Math.abs(accumulatedDelta) >= SCROLL_THRESHOLD) {
          if (accumulatedDelta > 0) {
            // 아래로 스크롤 = 다음 비디오 (위로 스와이프)
            handleSwipeUp();
          } else {
            // 위로 스크롤 = 이전 비디오 (아래로 스와이프)
            handleSwipeDown();
          }
          accumulatedDelta = 0;
        } else {
          // 임계값 미달 시 일정 시간 후 리셋
          setTimeout(() => {
            accumulatedDelta = 0;
          }, RESET_TIMEOUT);
        }
      }, 50);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
      }
    };
  }, [isMobile, handleSwipeUp, handleSwipeDown]);

  // 비디오가 없으면 로딩 표시
  if (videos.length === 0 && loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white">비디오를 불러오는 중...</div>
      </div>
    );
  }

  // 비디오가 없고 로딩도 완료되었으면 에러 메시지
  if (videos.length === 0 && !loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white">비디오를 불러올 수 없습니다</div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="h-screen w-full bg-black overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <div
          className="h-full w-full transition-transform duration-300 ease-out"
          style={{
            transform: `translateY(-${currentIndex * 100}%)`,
          }}
        >
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="h-screen w-full relative flex items-center justify-center"
              style={{ touchAction: "none" }}
            >
              <div className="relative w-full h-full">
                <MobileVideoPlayer
                  src={video.videoUrl}
                  poster={video.thumbnailUrl}
                  videoId={video.id}
                  onSwipeUp={handleSwipeUp}
                  onSwipeDown={handleSwipeDown}
                  onDoubleTap={() => {
                    // Handle like
                  }}
                  className="h-full w-full"
                />
                <div 
                  className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"
                >
                  <div className="flex items-end justify-between">
                    <div className="flex-1 pr-4 pointer-events-auto">
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
                    </div>
                    <div className="pointer-events-auto">
                      <VideoInteractions
                        videoId={video.id}
                        userId={video.user.id}
                        username={video.user.username}
                        userAvatar={video.user.avatar}
                        likes={
                          video.metrics?.likes ||
                          video._count?.likes ||
                          0
                        }
                        comments={
                          video.metrics?.comments ||
                          video._count?.comments ||
                          0
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {loading && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            비디오를 불러오는 중...
          </div>
        )}
      </div>
    );
  }

  // Desktop view (use existing VideoFeed component)
  return (
    <div className="h-screen w-full bg-black overflow-hidden">
      {/* Use existing VideoFeed for desktop */}
      <div
        ref={containerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide"
        onScroll={(e) => {
          const container = e.currentTarget;
          const scrollTop = container.scrollTop;
          const containerHeight = container.clientHeight;
          const newIndex = Math.round(scrollTop / containerHeight);
          
          if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            // 남은 비디오가 3개 이하일 때 추가 로드
            if (newIndex >= videos.length - 3 && hasMore && !loading) {
              loadMoreVideos();
            }
          }
        }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="h-screen w-full snap-start relative bg-black flex items-center justify-center"
          >
            <div className="relative w-full h-full">
              <VideoPlayerFeed
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                videoId={video.id}
                className="h-full w-full"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                <div className="flex items-end justify-between">
                  <div className="flex-1 pr-4 pointer-events-auto">
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
                  </div>
                  <div className="pointer-events-auto relative z-10">
                    <VideoInteractions
                      key={video.id}
                      videoId={video.id}
                      userId={video.user.id}
                      username={video.user.username}
                      userAvatar={video.user.avatar}
                      likes={
                        video.metrics?.likes || video._count?.likes || 0
                      }
                      comments={
                        video.metrics?.comments || video._count?.comments || 0
                      }
                      onOpenCommentModal={(videoId) => setOpenCommentModalVideoId(videoId)}
                      onOpenShareModal={(videoId) => setOpenShareModalVideoId(videoId)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="h-screen flex items-center justify-center">
            <div className="text-white text-sm">비디오를 불러오는 중...</div>
          </div>
        )}
      </div>

      {/* 댓글 모달 */}
      {openCommentModalVideoId && (
        <CommentModal
          key={`comment-${openCommentModalVideoId}`}
          videoId={openCommentModalVideoId}
          isOpen={true}
          onClose={() => setOpenCommentModalVideoId(null)}
        />
      )}

      {/* 공유 모달 */}
      {openShareModalVideoId && (
        <ShareModal
          key={`share-${openShareModalVideoId}`}
          videoId={openShareModalVideoId}
          videoTitle={`비디오`}
          videoThumbnail={undefined}
          isOpen={true}
          onClose={() => setOpenShareModalVideoId(null)}
        />
      )}
    </div>
  );
}

