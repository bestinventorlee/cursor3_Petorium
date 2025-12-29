"use client";

import { motion, AnimatePresence } from "framer-motion";
import CommentSection from "./CommentSection";

interface CommentModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CommentModal({
  videoId,
  isOpen,
  onClose,
}: CommentModalProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center"
          onClick={onClose}
        >
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-2xl md:max-h-[80vh] h-[80vh] md:h-auto flex flex-col"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                댓글
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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

            {/* 댓글 섹션 */}
            <div className="flex-1 overflow-y-auto p-4">
              <CommentSection videoId={videoId} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

