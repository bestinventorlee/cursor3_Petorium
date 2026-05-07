"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import MobileVideoPlayer from "./MobileVideoPlayer";
import VideoPlayerFeed from "./VideoPlayerFeed";
import VideoInteractions from "./VideoInteractions";
import CommentModal from "./CommentModal";
import ShareModal from "./ShareModal";
import PetoriumFeedShell from "./PetoriumFeedShell";
import AdSlotCard from "./AdSlotCard";
import FeedSwipeLayer from "./FeedSwipeLayer";
import { withBasePath } from "@/lib/base-path";

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
  hashtags?: { id: string; name: string }[];
}

type FeedItem =
  | { type: "video"; video: Video }
  | { type: "ad"; id: string };

interface ResponsiveVideoFeedProps {
  initialVideos?: Video[];
}

const ACCENT_BY_CATEGORY: Record<string, string> = {
  Dog: "#E8B86D",
  Cat: "#B8A9C9",
  Rabbit: "#F4A7B9",
  Bird: "#88C999",
  Exotic: "#6EC6CA",
  All: "#FF6B6B",
};

function mergeFeedItems(videos: Video[]): FeedItem[] {
  const out: FeedItem[] = [];
  videos.forEach((v, i) => {
    out.push({ type: "video", video: v });
    if ((i + 1) % 2 === 0 && i !== videos.length - 1) {
      out.push({ type: "ad", id: `ad-${i}` });
    }
  });
  return out;
}

function filterVideosByTag(videos: Video[], tag: string): Video[] {
  if (tag === "All") return videos;
  const t = tag.toLowerCase();
  return videos.filter((v) =>
    v.hashtags?.some((h) => h.name.toLowerCase() === t)
  );
}

function formatNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function categoryAccent(video: Video): string {
  const keys = Object.keys(ACCENT_BY_CATEGORY).filter((k) => k !== "All");
  const names = video.hashtags?.map((h) => h.name.toLowerCase()) ?? [];
  for (const key of keys) {
    if (names.includes(key.toLowerCase())) {
      return ACCENT_BY_CATEGORY[key];
    }
  }
  return ACCENT_BY_CATEGORY.Dog;
}

function petChipLabel(video: Video): string {
  const keys = ["Dog", "Cat", "Rabbit", "Bird", "Exotic"];
  const names = video.hashtags?.map((h) => h.name) ?? [];
  for (const key of keys) {
    const found = names.find((n) => n.toLowerCase() === key.toLowerCase());
    if (found) return found;
  }
  return video.hashtags?.[0]?.name ?? "Pet";
}

export default function ResponsiveVideoFeed({
  initialVideos = [],
}: ResponsiveVideoFeedProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [activeTag, setActiveTag] = useState("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);
  const [openCommentModalVideoId, setOpenCommentModalVideoId] = useState<
    string | null
  >(null);
  const [openShareModalVideoId, setOpenShareModalVideoId] = useState<
    string | null
  >(null);

  const filteredVideos = useMemo(
    () => filterVideosByTag(videos, activeTag),
    [videos, activeTag]
  );

  const feedItems = useMemo(
    () => mergeFeedItems(filteredVideos),
    [filteredVideos]
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [activeTag]);

  useEffect(() => {
    if (feedItems.length === 0) return;
    setCurrentIndex((i) => Math.min(i, feedItems.length - 1));
  }, [feedItems.length]);

  const loadMoreVideos = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const url = nextCursor
        ? `/api/feed/for-you?cursor=${encodeURIComponent(nextCursor)}&limit=15`
        : `/api/feed/for-you?limit=15`;

      const response = await fetch(withBasePath(url));
      if (!response.ok) throw new Error("Failed to fetch videos");
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

  useEffect(() => {
    if (!initialLoadRef.current && videos.length === 0 && !loading) {
      initialLoadRef.current = true;
      loadMoreVideos();
    }
  }, [videos.length, loading, loadMoreVideos]);

  const handleSwipeUp = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex < feedItems.length - 1) {
        return prevIndex + 1;
      }
      return prevIndex;
    });
  }, [feedItems.length]);

  const handleSwipeDown = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex > 0) return prevIndex - 1;
      return prevIndex;
    });
  }, []);

  useEffect(() => {
    let maxVi = -1;
    for (let i = 0; i <= currentIndex && i < feedItems.length; i++) {
      if (feedItems[i].type === "video") maxVi++;
    }
    const threshold = Math.max(0, filteredVideos.length - 3);
    if (
      filteredVideos.length > 0 &&
      maxVi >= threshold &&
      hasMore &&
      !loading
    ) {
      loadMoreVideos();
    }
  }, [
    currentIndex,
    feedItems,
    filteredVideos.length,
    hasMore,
    loading,
    loadMoreVideos,
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let accumulatedDelta = 0;
    let wheelTimeout: NodeJS.Timeout | null = null;
    const SCROLL_THRESHOLD = 48;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      accumulatedDelta += e.deltaY;
      if (wheelTimeout) clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (Math.abs(accumulatedDelta) >= SCROLL_THRESHOLD) {
          if (accumulatedDelta > 0) handleSwipeUp();
          else handleSwipeDown();
          accumulatedDelta = 0;
        } else {
          setTimeout(() => {
            accumulatedDelta = 0;
          }, 120);
        }
      }, 16);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [handleSwipeUp, handleSwipeDown]);

  const currentItem = feedItems[currentIndex];

  const renderVideoOverlay = (video: Video, accent: string) => (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-black/85 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-4 top-4 z-[5] rounded-full px-3 py-1 text-[11px] font-bold tracking-wide text-white"
        style={{ backgroundColor: `${accent}CC` }}
      >
        {petChipLabel(video)}
      </div>
      {/* 바깥은 pointer-events-none — 빈 여백 스와이프가 아래 비디오 플레이어로 전달되도록 */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between p-4 pb-6">
        <div className="pointer-events-auto min-w-0 flex-1 pr-3">
          <Link
            href={`/user/${video.user.username}`}
            className="mb-1 block font-display text-[15px] font-bold text-white"
          >
            @{video.user.username}
          </Link>
          <p className="mb-2 line-clamp-2 text-[13px] leading-snug text-[#eee]">
            {video.description || video.title}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[12px] font-semibold" style={{ color: accent }}>
              #반려동물
            </span>
            <span className="text-[12px] font-semibold" style={{ color: accent }}>
              #petorium
            </span>
            {(video.hashtags ?? []).slice(0, 3).map((h) => (
              <span
                key={h.id}
                className="text-[12px] font-semibold"
                style={{ color: accent }}
              >
                #{h.name}
              </span>
            ))}
          </div>
        </div>
        <div className="pointer-events-auto relative z-20 shrink-0 pb-2">
          <VideoInteractions
            videoId={video.id}
            userId={video.user.id}
            username={video.user.username}
            userAvatar={video.user.avatar}
            likes={
              video.metrics?.likes ?? video._count?.likes ?? 0
            }
            comments={
              video.metrics?.comments ?? video._count?.comments ?? 0
            }
            visualVariant="pawreel"
            onOpenCommentModal={(id) => setOpenCommentModalVideoId(id)}
            onOpenShareModal={(id) => setOpenShareModalVideoId(id)}
          />
        </div>
      </div>
    </>
  );

  const renderFeedSlide = (item: FeedItem) => {
    if (item.type === "ad") {
      return (
        <div
          key={item.id}
          className={`relative w-full shrink-0 overflow-hidden bg-black ${
            isMobile ? "h-[100dvh]" : "h-[780px]"
          }`}
        >
          <FeedSwipeLayer
            onSwipeUp={handleSwipeUp}
            onSwipeDown={handleSwipeDown}
            className="relative h-full w-full min-h-0"
          >
            <AdSlotCard />
          </FeedSwipeLayer>
        </div>
      );
    }

    const video = item.video;
    const accent = categoryAccent(video);

    return (
      <div
        key={video.id}
        className={`relative w-full shrink-0 overflow-hidden bg-black ${
          isMobile ? "h-[100dvh]" : "h-[780px]"
        }`}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br opacity-90"
          style={{
            background: `linear-gradient(160deg, ${accent}33 0%, #111 60%)`,
          }}
          aria-hidden
        />
        {isMobile ? (
          <MobileVideoPlayer
            src={video.videoUrl}
            poster={video.thumbnailUrl}
            videoId={video.id}
            onSwipeUp={handleSwipeUp}
            onSwipeDown={handleSwipeDown}
            className="relative z-[2] h-full w-full"
          />
        ) : (
          <VideoPlayerFeed
            src={video.videoUrl}
            poster={video.thumbnailUrl}
            videoId={video.id}
            className="relative z-[2] h-full w-full object-cover"
          />
        )}
        {renderVideoOverlay(video, accent)}
      </div>
    );
  };

  const rightPanel =
    currentItem?.type === "video" ? (
      <>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#555]">
          현재 영상
        </div>
        <div className="rounded-2xl bg-white/[0.04] p-4">
          <div className="mb-1 font-bold text-[#FF6B6B]">
            @{currentItem.video.user.username}
          </div>
          <div className="text-xs text-[#666]">
            {petChipLabel(currentItem.video)}
          </div>
        </div>
        {[
          ["❤️", "좋아요", currentItem.video.metrics?.likes ?? currentItem.video._count?.likes ?? 0],
          ["💬", "댓글", currentItem.video.metrics?.comments ?? currentItem.video._count?.comments ?? 0],
          ["👁", "조회", currentItem.video.views ?? currentItem.video.metrics?.views ?? 0],
        ].map(([icon, label, val]) => (
          <div key={label} className="flex items-center justify-between text-[13px]">
            <span className="text-[#555]">
              {icon} {label}
            </span>
            <span className="font-bold text-white">{formatNum(Number(val))}</span>
          </div>
        ))}
        <div className="h-px bg-[#222]" />
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#555]">
          광고 슬롯
        </div>
        <div className="rounded-xl border border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.08)] p-3 text-xs text-[#FF6B6B]">
          📢 2개 영상마다 스폰서 카드가 삽입됩니다
          <br />
          <span className="text-[#555]">브랜드 노출 영역</span>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-[#555]">
          💡 휠 또는 스와이프로 피드를 넘겨 보세요
        </p>
      </>
    ) : (
      <>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#555]">
          현재 영상
        </div>
        <div className="rounded-xl border border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.08)] p-4 text-[13px] text-[#FF6B6B]">
          📢 스폰서 콘텐츠
          <br />
          <br />
          <span className="text-[#aaa]">
            전체 화면 브랜드 메시지가 표시되는 슬롯입니다.
          </span>
        </div>
      </>
    );

  const phoneChrome = (
    <>
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-[100] flex justify-between px-5 pt-3 text-[12px] font-bold text-white">
        <span>
          {new Date().toLocaleTimeString("ko-KR", {
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
        <span className="font-normal opacity-90">5G 🔋</span>
      </div>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden bg-black"
        style={{ touchAction: "none" }}
      >
        <div
          className="flex h-full w-full flex-col transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: `translateY(-${currentIndex * 780}px)`,
          }}
        >
          {feedItems.map((item) => renderFeedSlide(item))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[100] flex justify-around border-t border-white/5 bg-black/70 px-2 pb-5 pt-2.5 backdrop-blur-[16px]">
        {[
          ["🏠", "피드", "/feed"],
          ["🔍", "검색", "/search"],
          ["➕", "업로드", "/upload"],
          ["🔔", "알림", "/trending"],
          ["👤", "나", "/profile"],
        ].map(([icon, label, href]) => (
          <Link
            key={label}
            href={href}
            className={`flex cursor-pointer flex-col items-center gap-1 text-[10px] ${
              label === "피드" ? "text-[#FF6B6B]" : "text-[#666]"
            }`}
          >
            <span className="text-xl">{icon}</span>
            {label}
          </Link>
        ))}
      </div>
      <div className="pointer-events-auto absolute right-1.5 top-1/2 z-[100] flex -translate-y-1/2 flex-col gap-1">
        {feedItems.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`슬라이드 ${i + 1}`}
            onClick={() => setCurrentIndex(i)}
            className={`rounded-full transition-all ${
              i === currentIndex
                ? "h-5 bg-[#FF6B6B]"
                : "h-1.5 bg-[#444]"
            } w-[3px]`}
          />
        ))}
      </div>
    </>
  );

  if (videos.length === 0 && loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-white">비디오를 불러오는 중...</div>
      </div>
    );
  }

  if (feedItems.length === 0 && !loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-[#888]">
          {activeTag === "All"
            ? "표시할 비디오가 없습니다."
            : "이 카테고리에 맞는 영상이 없습니다."}
        </p>
        {activeTag !== "All" && (
          <button
            type="button"
            onClick={() => setActiveTag("All")}
            className="rounded-full bg-[#FF6B6B] px-5 py-2 text-sm font-bold text-white"
          >
            전체 보기
          </button>
        )}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
        <div
          ref={containerRef}
          className="relative h-full w-full overflow-hidden"
          style={{ touchAction: "none" }}
        >
          <div
            className="flex h-full w-full flex-col transition-transform duration-200 ease-out will-change-transform"
            style={{
              transform: `translateY(-${currentIndex * 100}dvh)`,
            }}
          >
            {feedItems.map((item) => renderFeedSlide(item))}
          </div>
        </div>
        {loading && (
          <div className="absolute bottom-20 left-1/2 z-[110] -translate-x-1/2 text-sm text-white/80">
            불러오는 중...
          </div>
        )}
        {openCommentModalVideoId && (
          <CommentModal
            key={`comment-${openCommentModalVideoId}`}
            videoId={openCommentModalVideoId}
            isOpen
            onClose={() => setOpenCommentModalVideoId(null)}
          />
        )}
        {openShareModalVideoId && (
          <ShareModal
            key={`share-${openShareModalVideoId}`}
            videoId={openShareModalVideoId}
            videoTitle="비디오"
            isOpen
            onClose={() => setOpenShareModalVideoId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <PetoriumFeedShell
        activeTag={activeTag}
        onTagChange={setActiveTag}
        phoneFrame={
          <div
            className="relative h-[780px] w-[375px] shrink-0 overflow-hidden rounded-[44px] border-[3px] border-[#2a2a2a] shadow-[0_40px_80px_rgba(0,0,0,0.8),0_0_0_1px_#333]"
            style={{ touchAction: "none" }}
          >
            {phoneChrome}
          </div>
        }
        rightPanel={rightPanel}
      />
      {loading && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 text-sm text-white/80 md:left-[calc(50%+120px)]">
          불러오는 중...
        </div>
      )}
      {openCommentModalVideoId && (
        <CommentModal
          key={`comment-${openCommentModalVideoId}`}
          videoId={openCommentModalVideoId}
          isOpen
          onClose={() => setOpenCommentModalVideoId(null)}
        />
      )}
      {openShareModalVideoId && (
        <ShareModal
          key={`share-${openShareModalVideoId}`}
          videoId={openShareModalVideoId}
          videoTitle="비디오"
          isOpen
          onClose={() => setOpenShareModalVideoId(null)}
        />
      )}
    </>
  );
}
