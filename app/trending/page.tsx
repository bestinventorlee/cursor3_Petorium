"use client";

import { useState, useEffect } from "react";
import VideoGrid from "@/components/VideoGrid";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface TrendingHashtag {
  id: string;
  name: string;
  videoCount: number;
  recentVideos: number;
  uniqueCreators: number;
}

interface TrendingVideo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl: string;
  views: number;
  duration?: number;
  createdAt: string;
  engagementRate: number;
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

interface TrendingCreator {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  _count: {
    videos: number;
    likes: number;
  };
  metrics: {
    recentVideos: number;
    totalViews: number;
    avgViews: number;
  };
}

export default function TrendingPage() {
  const [activeTab, setActiveTab] = useState<"hashtags" | "videos" | "creators">(
    "hashtags"
  );
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [creators, setCreators] = useState<TrendingCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    fetchTrendingData();
  }, [activeTab, period]);

  const fetchTrendingData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "hashtags": {
          const response = await fetch(
            `/api/trending/hashtags?period=${period}&limit=20`
          );
          if (response.ok) {
            const data = await response.json();
            setHashtags(data.hashtags || []);
          }
          break;
        }
        case "videos": {
          const response = await fetch(
            `/api/trending/videos?period=${period}&limit=20`
          );
          if (response.ok) {
            const data = await response.json();
            setVideos(data.videos || []);
          }
          break;
        }
        case "creators": {
          const response = await fetch(
            `/api/trending/creators?period=${period}&limit=20`
          );
          if (response.ok) {
            const data = await response.json();
            setCreators(data.creators || []);
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error fetching trending data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-3xl font-bold mb-6">트렌딩</h1>

        {/* Period Selector */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setPeriod("24h")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              period === "24h"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            24시간
          </button>
          <button
            onClick={() => setPeriod("7d")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              period === "7d"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            7일
          </button>
          <button
            onClick={() => setPeriod("30d")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              period === "30d"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            30일
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("hashtags")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "hashtags"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              해시태그
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "videos"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              바이럴 비디오
            </button>
            <button
              onClick={() => setActiveTab("creators")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "creators"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              인기 크리에이터
            </button>
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {activeTab === "hashtags" && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {hashtags.map((hashtag, index) => (
                  <motion.div
                    key={hashtag.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/search?q=${encodeURIComponent(hashtag.name)}&type=video`}>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition">
                        <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400 mb-2">
                          #{hashtag.name}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>{formatCount(hashtag.videoCount)} 비디오</p>
                          <p>{formatCount(hashtag.recentVideos)} 최근 비디오</p>
                          <p>{formatCount(hashtag.uniqueCreators)} 크리에이터</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === "videos" && (
              <VideoGrid videos={videos as any} loading={false} />
            )}

            {activeTab === "creators" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creators.map((creator, index) => (
                  <motion.div
                    key={creator.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/user/${creator.username}`}>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
                        <div className="flex items-center space-x-4 mb-4">
                          {creator.avatar ? (
                            <Image
                              src={creator.avatar}
                              alt={creator.username}
                              width={64}
                              height={64}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-xl font-medium">
                                {creator.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">
                              {creator.name || creator.username}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{creator.username}
                            </p>
                          </div>
                        </div>
                        {creator.bio && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                            {creator.bio}
                          </p>
                        )}
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="font-semibold">{formatCount(creator.followers)}</p>
                            <p className="text-xs text-gray-500">팔로워</p>
                          </div>
                          <div>
                            <p className="font-semibold">{creator.metrics.recentVideos}</p>
                            <p className="text-xs text-gray-500">최근 비디오</p>
                          </div>
                          <div>
                            <p className="font-semibold">
                              {formatCount(creator.metrics.avgViews)}
                            </p>
                            <p className="text-xs text-gray-500">평균 조회수</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

