"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import { setupTouchGestures, TouchGestureCallbacks } from "@/lib/touch-gestures";
import Image from "next/image";
import LongPressMenu from "./LongPressMenu";

interface MobileVideoPlayerProps {
  src: string;
  poster?: string;
  videoId: string;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  className?: string;
}

export default function MobileVideoPlayer({
  src,
  poster,
  videoId,
  onSwipeUp,
  onSwipeDown,
  onDoubleTap,
  onLongPress,
  className = "",
}: MobileVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [longPressPosition, setLongPressPosition] = useState({ x: 0, y: 0 });
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false,
  });

  // 비디오 비율 감지
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      setVideoAspectRatio(aspectRatio);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    
    // 이미 로드된 경우
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (inView) {
      video.play().catch((error) => {
        console.error("Error playing video:", error);
      });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [inView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const callbacks: TouchGestureCallbacks = {
      onSwipeUp: () => {
        onSwipeUp?.();
        hideControls();
      },
      onSwipeDown: () => {
        onSwipeDown?.();
        hideControls();
      },
      onDoubleTap: () => {
        handleDoubleTap();
      },
      onLongPress: () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setLongPressPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
          setShowLongPressMenu(true);
        }
        onLongPress?.();
      },
    };

    const cleanup = setupTouchGestures(container, callbacks);
    return cleanup;
  }, [onSwipeUp, onSwipeDown, onLongPress]);

  const handleDoubleTap = () => {
    setShowLikeAnimation(true);
    setTimeout(() => setShowLikeAnimation(false), 1000);
    onDoubleTap?.();
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
    showControlsTemporarily();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
    showControlsTemporarily();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const hideControls = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(false);
  };

  // 세로 비디오는 비율을 유지하면서 전체 화면을 채우도록
  const isVerticalVideo = videoAspectRatio !== null && videoAspectRatio < 1;

  // ref callback을 사용하여 두 ref를 모두 설정
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    // useInView의 ref 설정
    if (typeof inViewRef === 'function') {
      inViewRef(node);
    } else if (inViewRef) {
      (inViewRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
    // containerRef 설정
    containerRef.current = node;
  }, [inViewRef]);

  return (
    <div
      ref={setRefs}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}
      style={{ touchAction: "none" }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={isVerticalVideo ? "h-full w-auto object-contain" : "w-full h-full object-contain"}
        style={isVerticalVideo ? {
          maxWidth: "100%",
          maxHeight: "100%",
        } : {
          maxWidth: "100%",
          maxHeight: "100%",
        }}
        playsInline
        muted={isMuted}
        loop
        preload="metadata"
      />

      {/* Double-tap like animation */}
      <AnimatePresence>
        {showLikeAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <svg
              className="w-24 h-24 text-red-500 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 flex items-center justify-center"
            onClick={togglePlayPause}
          >
            <div className="flex items-center space-x-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="p-4 bg-black/50 rounded-full"
              >
                {isPlaying ? (
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="p-4 bg-black/50 rounded-full"
              >
                {isMuted ? (
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
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                ) : (
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
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Long press menu */}
      <LongPressMenu
        isOpen={showLongPressMenu}
        onClose={() => setShowLongPressMenu(false)}
        position={longPressPosition}
        options={[
          {
            label: "공유",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            ),
            onClick: () => {
              // Handle share
            },
          },
          {
            label: "신고",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ),
            onClick: () => {
              // Handle report
            },
            destructive: true,
          },
        ]}
      />
    </div>
  );
}

