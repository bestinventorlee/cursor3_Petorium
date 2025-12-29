"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

interface CommentSocketProps {
  videoId: string;
  onNewComment: (comment: any) => void;
  onCommentDeleted: (commentId: string) => void;
}

export function useCommentSocket({
  videoId,
  onNewComment,
  onCommentDeleted,
}: CommentSocketProps) {
  useEffect(() => {
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to comment socket");
      socket.emit("join-video", videoId);
    });

    socket.on("comment-added", (comment) => {
      if (comment.videoId === videoId) {
        onNewComment(comment);
      }
    });

    socket.on("comment-deleted", (data) => {
      if (data.videoId === videoId) {
        onCommentDeleted(data.commentId);
      }
    });

    return () => {
      socket.emit("leave-video", videoId);
      socket.disconnect();
    };
  }, [videoId, onNewComment, onCommentDeleted]);
}

