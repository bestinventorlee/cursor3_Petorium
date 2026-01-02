"use client";

import { useEffect, useState } from "react";
import ResponsiveVideoFeed from "@/components/ResponsiveVideoFeed";

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

export default function FeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // 추천 피드 사용
        const response = await fetch("/api/feed/for-you?limit=15");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.videos && data.videos.length > 0) {
          setVideos(data.videos);
        } else {
          // 비디오가 없으면 폴백 시도
          throw new Error("No videos found");
        }
      } catch (error) {
        console.error("Error fetching videos:", error);
        // 폴백: 일반 비디오 목록
        try {
          const fallbackResponse = await fetch("/api/videos?page=1&limit=15");
          
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback HTTP error! status: ${fallbackResponse.status}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.videos && fallbackData.videos.length > 0) {
            setVideos(fallbackData.videos);
          }
        } catch (fallbackError) {
          console.error("Error fetching fallback videos:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black overflow-hidden">
      <ResponsiveVideoFeed initialVideos={videos} />
    </div>
  );
}

