"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface SearchSuggestion {
  id: string;
  text: string;
  type: "video" | "user" | "hashtag";
  username?: string;
  avatar?: string;
  name?: string;
  videoCount?: number;
}

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  className?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "검색...",
  showSuggestions = true,
  className = "",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem("searchHistory");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (error) {
        console.error("Error loading search history:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Debounce search suggestions
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.length >= 2 && showSuggestions) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions();
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, showSuggestions]);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestionsList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async () => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query)}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestionsList(true);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Add to search history
    const newHistory = [
      searchQuery,
      ...searchHistory.filter((h) => h !== searchQuery),
    ].slice(0, 10); // Keep last 10 searches
    setSearchHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));

    // Navigate to search page
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    setShowSuggestionsList(false);

    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    let url = "";
    switch (suggestion.type) {
      case "video":
        url = `/video/${suggestion.id}`;
        break;
      case "user":
        url = `/user/${suggestion.username}`;
        break;
      case "hashtag":
        url = `/search?q=${encodeURIComponent(suggestion.name || "")}&type=hashtag`;
        break;
    }
    router.push(url);
    setShowSuggestionsList(false);
    setQuery("");
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("searchHistory");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 || searchHistory.length > 0) {
              setShowSuggestionsList(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 pr-8 sm:pr-10 text-sm sm:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg
            className="w-5 h-5 text-gray-400"
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
        </div>
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestionsList && (suggestions.length > 0 || searchHistory.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto"
          >
            {/* Search History */}
            {query.length === 0 && searchHistory.length > 0 && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    최근 검색
                  </span>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    모두 지우기
                  </button>
                </div>
                {searchHistory.map((historyItem, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(historyItem)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm">{historyItem}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.id}-${index}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-3"
                  >
                    {suggestion.type === "user" && suggestion.avatar ? (
                      <Image
                        src={suggestion.avatar}
                        alt={suggestion.text}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        {suggestion.type === "video" && (
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        )}
                        {suggestion.type === "hashtag" && (
                          <span className="text-xs font-bold">#</span>
                        )}
                        {suggestion.type === "user" && (
                          <span className="text-xs">
                            {suggestion.text[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {suggestion.text}
                      </p>
                      {suggestion.type === "hashtag" && suggestion.videoCount !== undefined && (
                        <p className="text-xs text-gray-500">
                          {suggestion.videoCount.toLocaleString()} 비디오
                        </p>
                      )}
                      {suggestion.type === "user" && suggestion.username && (
                        <p className="text-xs text-gray-500">
                          @{suggestion.username}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

