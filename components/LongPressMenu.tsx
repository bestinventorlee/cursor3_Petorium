"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

interface LongPressMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  options: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
  }>;
}

export default function LongPressMenu({
  isOpen,
  onClose,
  position,
  options,
}: LongPressMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[200px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="py-2">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                option.onClick();
                onClose();
              }}
              className={`w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                option.destructive
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

