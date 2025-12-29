"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useCommentSocket } from "./CommentSocket";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    image?: string;
  };
  _count: {
    replies: number;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  videoId: string;
  initialComments?: Comment[];
  onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({
  videoId,
  initialComments = [],
  onCommentCountChange,
}: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialComments.length > 0) {
      setComments(initialComments);
    } else {
      fetchComments();
    }
  }, [videoId]);

  // 실시간 댓글 업데이트
  useCommentSocket({
    videoId,
    onNewComment: (comment) => {
      setComments((prev) => {
        // 중복 방지
        if (prev.some((c) => c.id === comment.id)) {
          return prev;
        }
        return [comment, ...prev];
      });
    },
    onCommentDeleted: (commentId) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
  });

  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(comments.length);
    }
  }, [comments.length, onCommentCountChange]);

  const fetchComments = async (pageNum: number = 1) => {
    try {
      const response = await fetch(
        `/api/videos/${videoId}/comments?page=${pageNum}&limit=20`
      );
      const data = await response.json();

      if (data.comments) {
        if (pageNum === 1) {
          setComments(data.comments);
        } else {
          setComments((prev) => [...prev, ...data.comments]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setLoading(true);
    const content = newComment.trim();

    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        try {
          const comment = await response.json();
          setComments((prev) => [comment, ...prev]);
          setNewComment("");
        } catch (error) {
          console.error("Error parsing comment response:", error);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "댓글 작성 중 오류가 발생했습니다" }));
        console.error("Error posting comment:", errorData.error);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim(), parentId }),
      });

      if (response.ok) {
        const reply = await response.json();
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === parentId
              ? {
                  ...comment,
                  replies: [...(comment.replies || []), reply],
                  _count: {
                    ...comment._count,
                    replies: comment._count.replies + 1,
                  },
                }
              : comment
          )
        );
        setReplyContent("");
        setReplyingTo(null);
        if (!expandedReplies.has(parentId)) {
          setExpandedReplies(new Set([...expandedReplies, parentId]));
        }
      }
    } catch (error) {
      console.error("Error posting reply:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/videos/${videoId}/comments/${commentId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const loadMoreReplies = async (commentId: string) => {
    try {
      const response = await fetch(
        `/api/videos/${videoId}/comments/${commentId}?page=1&limit=10`
      );
      const data = await response.json();

      if (data.replies) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? { ...comment, replies: data.replies }
              : comment
          )
        );
        setExpandedReplies(new Set([...expandedReplies, commentId]));
      }
    } catch (error) {
      console.error("Error loading replies:", error);
    }
  };

  return (
    <div className="space-y-4">

      {/* 댓글 작성 */}
      {user && (
        <form onSubmit={handleSubmitComment} className="space-y-2">
          <textarea
            ref={commentInputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {newComment.length}/1000
            </span>
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "작성 중..." : "댓글 작성"}
            </button>
          </div>
        </form>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-4">
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0"
            >
              <div className="flex space-x-3">
                <Link href={`/user/${comment.user.username}`}>
                  {comment.user.avatar || comment.user.image ? (
                    <Image
                      src={comment.user.avatar || comment.user.image!}
                      alt={comment.user.username}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {comment.user.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Link
                      href={`/user/${comment.user.username}`}
                      className="font-semibold hover:underline"
                    >
                      {comment.user.username}
                    </Link>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <button
                      onClick={() =>
                        setReplyingTo(
                          replyingTo === comment.id ? null : comment.id
                        )
                      }
                      className="text-sm text-gray-500 hover:text-blue-600"
                    >
                      답글
                    </button>
                    {user && user.id === comment.user.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  {/* 답글 입력 */}
                  <AnimatePresence>
                    {replyingTo === comment.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-2"
                      >
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder={`@${comment.user.username}에게 답글...`}
                          rows={2}
                          maxLength={1000}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent("");
                            }}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={loading || !replyContent.trim()}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            답글 작성
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 답글 목록 */}
                  {comment._count.replies > 0 && (
                    <div className="mt-2">
                      {!expandedReplies.has(comment.id) ? (
                        <button
                          onClick={() => loadMoreReplies(comment.id)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          답글 {comment._count.replies}개 보기
                        </button>
                      ) : (
                        <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                          {comment.replies?.map((reply) => (
                            <div key={reply.id} className="flex space-x-2">
                              <Link href={`/user/${reply.user.username}`}>
                                {reply.user.avatar || reply.user.image ? (
                                  <Image
                                    src={reply.user.avatar || reply.user.image!}
                                    alt={reply.user.username}
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-xs font-medium">
                                      {reply.user.username[0].toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </Link>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <Link
                                    href={`/user/${reply.user.username}`}
                                    className="text-sm font-semibold hover:underline"
                                  >
                                    {reply.user.username}
                                  </Link>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(
                                      new Date(reply.createdAt),
                                      {
                                        addSuffix: true,
                                        locale: ko,
                                      }
                                    )}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 더 보기 */}
      {hasMore && (
        <button
          onClick={() => {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchComments(nextPage);
          }}
          className="w-full py-2 text-center text-blue-600 hover:bg-blue-50 rounded-md"
        >
          더 보기
        </button>
      )}
    </div>
  );
}

