"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import VideoGrid from "@/components/VideoGrid";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

type SearchType = "video" | "user" | "hashtag";

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl: string;
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

interface User {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
  image?: string;
  bio?: string;
  followers: number;
  following: number;
  _count: {
    videos: number;
  };
}

interface Hashtag {
  id: string;
  name: string;
  videoCount: number;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState<SearchType>(
    (searchParams.get("type") as SearchType) || "video"
  );
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const performSearch = useCallback(async (pageNum: number = 1) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${activeTab}&page=${pageNum}&limit=20`
      );

      if (response.ok) {
        const data = await response.json();
        if (pageNum === 1) {
          setResults(data.results || []);
        } else {
          setResults((prev) => [...prev, ...(data.results || [])]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setTotal(data.pagination.total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  }, [query, activeTab]);

  useEffect(() => {
    if (query.trim()) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [query, activeTab, performSearch]);

  const handleTabChange = (tab: SearchType) => {
    setActiveTab(tab);
    setPage(1);
    router.push(`/search?q=${encodeURIComponent(query)}&type=${tab}`);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      performSearch(page + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            onSearch={(q) => {
              setQuery(q);
              router.push(`/search?q=${encodeURIComponent(q)}&type=${activeTab}`);
            }}
            placeholder="검색어를 입력하세요..."
            className="max-w-2xl mx-auto"
          />
        </div>

        {query && (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => handleTabChange("video")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                    activeTab === "video"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  비디오
                </button>
                <button
                  onClick={() => handleTabChange("user")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                    activeTab === "user"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  사용자
                </button>
                <button
                  onClick={() => handleTabChange("hashtag")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                    activeTab === "hashtag"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  해시태그
                </button>
              </nav>
            </div>

            {/* Results Count */}
            {total > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {total.toLocaleString()}개의 결과
              </p>
            )}

            {/* Results */}
            {loading && results.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : activeTab === "video" ? (
              <VideoGrid
                videos={results as Video[]}
                loading={loading}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
              />
            ) : activeTab === "user" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(results as User[]).map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/user/${user.username}`}>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition">
                        <div className="flex items-center space-x-4">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt={user.username}
                              width={64}
                              height={64}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-xl font-medium">
                                {user.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold">{user.name || user.username}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{user.username}
                            </p>
                            {user.bio && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                                {user.bio}
                              </p>
                            )}
                            <div className="flex space-x-4 mt-2 text-sm text-gray-500">
                              <span>{user._count.videos} 비디오</span>
                              <span>{user.followers} 팔로워</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(results as Hashtag[]).map((hashtag, index) => (
                  <motion.div
                    key={hashtag.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/search?q=${encodeURIComponent(hashtag.name)}&type=video`}>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition text-center">
                        <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                          #{hashtag.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {hashtag.videoCount.toLocaleString()} 비디오
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && activeTab === "video" && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "로딩 중..." : "더 보기"}
                </button>
              </div>
            )}

            {/* No Results */}
            {!loading && results.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  검색 결과가 없습니다
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!query && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              검색어를 입력하여 검색하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

