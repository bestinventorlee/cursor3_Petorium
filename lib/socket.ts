import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join video room
    socket.on("join-video", (videoId: string) => {
      socket.join(`video:${videoId}`);
    });

    // Leave video room
    socket.on("leave-video", (videoId: string) => {
      socket.leave(`video:${videoId}`);
    });

    // Handle comments
    socket.on("new-comment", (data: { videoId: string; comment: any }) => {
      if (io) {
        io.to(`video:${data.videoId}`).emit("comment-added", data.comment);
      }
    });

    // Handle comment deletion
    socket.on("delete-comment", (data: { videoId: string; commentId: string }) => {
      if (io) {
        io.to(`video:${data.videoId}`).emit("comment-deleted", data);
      }
    });

    // Handle likes
    socket.on("like-video", (data: { videoId: string; userId: string }) => {
      socket.to(`video:${data.videoId}`).emit("video-liked", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
}

export function getSocketIO() {
  if (!io) {
    throw new Error("Socket.IO가 초기화되지 않았습니다");
  }
  return io;
}

