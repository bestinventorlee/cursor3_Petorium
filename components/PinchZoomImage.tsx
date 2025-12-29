"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { setupTouchGestures, TouchGestureCallbacks } from "@/lib/touch-gestures";

interface PinchZoomImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export default function PinchZoomImage({
  src,
  alt,
  width,
  height,
  className = "",
}: PinchZoomImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let currentScale = scale;
    let initialScale = 1;

    const callbacks: TouchGestureCallbacks = {
      onPinchStart: () => {
        initialScale = currentScale;
      },
      onPinch: (pinchScale: number) => {
        const newScale = Math.max(1, Math.min(3, initialScale * pinchScale));
        currentScale = newScale;
        setScale(newScale);
        setIsZoomed(newScale > 1);
      },
      onPinchEnd: () => {
        if (currentScale < 1.2) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
          setIsZoomed(false);
          currentScale = 1;
        }
      },
    };

    const cleanup = setupTouchGestures(container, callbacks);
    return cleanup;
  }, []);

  const handleDoubleClick = () => {
    if (isZoomed) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsZoomed(false);
    } else {
      setScale(2);
      setIsZoomed(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onDoubleClick={handleDoubleClick}
    >
      <motion.div
        ref={imageRef}
        animate={{
          scale,
          x: position.x,
          y: position.y,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="origin-center"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </motion.div>
      {isZoomed && (
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          더블탭하여 축소
        </div>
      )}
    </div>
  );
}

