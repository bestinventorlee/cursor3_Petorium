"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface ShareModalProps {
  videoId: string;
  videoTitle: string;
  videoThumbnail?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({
  videoId,
  videoTitle,
  videoThumbnail,
  isOpen,
  onClose,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && videoId) {
      fetchShareData();
    }
  }, [isOpen, videoId]);

  const fetchShareData = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/share`);
      if (response.ok) {
        const data = await response.json();
        setShareData(data);
      }
    } catch (error) {
      console.error("Error fetching share data:", error);
    }
  };

  const handleCopyLink = async () => {
    if (!shareData) return;

    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying link:", error);
    }
  };

  const handleShare = async (platform: string) => {
    if (!shareData) return;

    const url = shareData.shareUrl;
    const text = `${videoTitle} - Petorium에서 확인하세요`;

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            url
          )}&text=${encodeURIComponent(text)}`,
          "_blank"
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
          )}`,
          "_blank"
        );
        break;
      case "kakao":
        // Kakao SDK 필요 (선택적)
        if (typeof window !== "undefined" && (window as any).Kakao) {
          (window as any).Kakao.Share.sendDefault({
            objectType: "feed",
            content: {
              title: videoTitle,
              description: shareData.video.description || "",
              imageUrl: shareData.video.thumbnailUrl || "",
              link: {
                mobileWebUrl: url,
                webUrl: url,
              },
            },
          });
        } else {
          // Kakao SDK가 없으면 링크 복사
          await navigator.clipboard.writeText(url);
          alert("링크가 클립보드에 복사되었습니다");
        }
        break;
      case "native":
        if (navigator.share) {
          try {
            await navigator.share({
              title: videoTitle,
              text: text,
              url: url,
            });
          } catch (error) {
            // 사용자가 공유를 취소한 경우
          }
        }
        break;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />

        {/* 모달 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">공유하기</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 공유 미리보기 */}
          {shareData && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {videoThumbnail && (
                <Image
                  src={videoThumbnail}
                  alt={videoTitle}
                  width={400}
                  height={225}
                  className="w-full h-48 object-cover rounded mb-2"
                />
              )}
              <h3 className="font-semibold mb-1">{videoTitle}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {shareData.video.description || "Petorium 비디오"}
              </p>
            </div>
          )}

          {/* 링크 복사 */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={shareData?.shareUrl || ""}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {copied ? "복사됨!" : "복사"}
              </button>
            </div>
          </div>

          {/* 소셜 미디어 공유 */}
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => handleShare("twitter")}
              className="flex flex-col items-center space-y-2 p-4 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
              <span className="text-xs">Twitter</span>
            </button>

            <button
              onClick={() => handleShare("facebook")}
              className="flex flex-col items-center space-y-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-xs">Facebook</span>
            </button>

            <button
              onClick={() => handleShare("kakao")}
              className="flex flex-col items-center space-y-2 p-4 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
              </svg>
              <span className="text-xs">Kakao</span>
            </button>

            {navigator.share && (
              <button
                onClick={() => handleShare("native")}
                className="flex flex-col items-center space-y-2 p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                </svg>
                <span className="text-xs">공유</span>
              </button>
            )}
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

