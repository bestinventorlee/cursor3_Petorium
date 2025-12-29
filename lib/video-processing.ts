import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { promisify } from "util";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// Set ffmpeg path if using ffmpeg-static
if (ffmpegStatic && !process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

// Set ffprobe path if using ffprobe-static
// ffprobe-static exports an object with path property
// Next.js 빌드 시 경로가 변경될 수 있으므로 런타임에 절대 경로 확인
if (!process.env.FFPROBE_PATH) {
  let ffprobePath: string | undefined;
  
  if (ffprobeStatic) {
    if (typeof ffprobeStatic === "string") {
      ffprobePath = ffprobeStatic;
    } else {
      ffprobePath = (ffprobeStatic as any).path || (ffprobeStatic as any).default?.path || (ffprobeStatic as any).default;
    }
  }
  
  // 경로가 존재하는지 확인하고, 없으면 node_modules에서 직접 찾기
  if (ffprobePath) {
    try {
      const fs = require("fs");
      if (!fs.existsSync(ffprobePath)) {
        // node_modules에서 직접 찾기
        const path = require("path");
        const possiblePaths = [
          path.join(process.cwd(), "node_modules", "ffprobe-static", "bin", "win32", "x64", "ffprobe.exe"),
          path.join(process.cwd(), "node_modules", "ffprobe-static", "bin", "darwin", "x64", "ffprobe"),
          path.join(process.cwd(), "node_modules", "ffprobe-static", "bin", "linux", "x64", "ffprobe"),
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            ffprobePath = possiblePath;
            break;
          }
        }
      }
      
      if (ffprobePath && fs.existsSync(ffprobePath)) {
        ffmpeg.setFfprobePath(ffprobePath);
        console.log("FFprobe path set to:", ffprobePath);
      } else {
        console.warn("FFprobe not found at:", ffprobePath);
      }
    } catch (err) {
      console.error("Error setting ffprobe path:", err);
    }
  }
} else {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  size: number; // in bytes
}

export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: any) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((s: any) => s.codec_type === "video");
      if (!videoStream) {
        reject(new Error("비디오 스트림을 찾을 수 없습니다"));
        return;
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        size: metadata.format.size || 0,
      });
    });
  });
}

export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: number = 1
): Promise<string> {
  // 비디오 메타데이터 가져오기
  const metadata = await getVideoMetadata(videoPath);
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const originalAspectRatio = originalWidth / originalHeight;
  
  // 썸네일 크기 계산 (비율 유지)
  let thumbnailWidth = 720;
  let thumbnailHeight = 720;
  
  if (originalAspectRatio >= 1) {
    // 가로 비디오
    thumbnailHeight = Math.round(720 / originalAspectRatio);
  } else {
    // 세로 비디오
    thumbnailWidth = Math.round(720 * originalAspectRatio);
  }
  
  // 짝수로 맞추기
  thumbnailWidth = thumbnailWidth % 2 === 0 ? thumbnailWidth : thumbnailWidth - 1;
  thumbnailHeight = thumbnailHeight % 2 === 0 ? thumbnailHeight : thumbnailHeight - 1;
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: `${thumbnailWidth}x${thumbnailHeight}`,
      })
      .on("end", () => resolve(outputPath))
      .on("error", reject);
  });
}

export async function generateThumbnails(
  videoPath: string,
  outputDir: string,
  baseName: string,
  timestamps: number[]
): Promise<string[]> {
  // 비디오 메타데이터 가져오기
  const metadata = await getVideoMetadata(videoPath);
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const originalAspectRatio = originalWidth / originalHeight;
  
  // 썸네일 크기 계산 (비율 유지)
  let thumbnailWidth = 720;
  let thumbnailHeight = 720;
  
  if (originalAspectRatio >= 1) {
    // 가로 비디오
    thumbnailHeight = Math.round(720 / originalAspectRatio);
  } else {
    // 세로 비디오
    thumbnailWidth = Math.round(720 * originalAspectRatio);
  }
  
  // 짝수로 맞추기
  thumbnailWidth = thumbnailWidth % 2 === 0 ? thumbnailWidth : thumbnailWidth - 1;
  thumbnailHeight = thumbnailHeight % 2 === 0 ? thumbnailHeight : thumbnailHeight - 1;
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps,
        filename: `${baseName}-%i.jpg`,
        folder: outputDir,
        size: `${thumbnailWidth}x${thumbnailHeight}`,
      })
      .on("end", async () => {
        // 생성된 썸네일 파일 찾기
        const fs = require("fs").promises;
        const actualPaths: string[] = [];
        
        try {
          // 디렉토리에서 생성된 파일 찾기
          const files = await fs.readdir(outputDir);
          const thumbnailFiles = files
            .filter((file: string) => file.startsWith(baseName) && file.endsWith(".jpg"))
            .sort()
            .map((file: string) => path.join(outputDir, file));
          
          if (thumbnailFiles.length === 0) {
            // 예상 경로로 다시 시도
            for (let index = 0; index < timestamps.length; index++) {
              const expectedPath = path.join(outputDir, `${baseName}-${index}.jpg`);
              try {
                await fs.access(expectedPath);
                actualPaths.push(expectedPath);
              } catch {
                console.warn(`Thumbnail not found at ${expectedPath}`);
              }
            }
          } else {
            actualPaths.push(...thumbnailFiles);
          }
          
          if (actualPaths.length === 0) {
            reject(new Error("썸네일 생성에 실패했습니다"));
            return;
          }
          
          console.log(`Generated ${actualPaths.length} thumbnails:`, actualPaths);
          resolve(actualPaths);
        } catch (err: any) {
          console.error("Error finding thumbnail files:", err);
          reject(new Error(`썸네일 파일을 찾을 수 없습니다: ${err.message}`));
        }
      })
      .on("error", (err: Error) => {
        console.error("FFmpeg thumbnail generation error:", err);
        reject(err);
      });
  });
}

export async function processVideo(
  inputPath: string,
  outputPath: string
): Promise<string> {
  // 원본 비디오 메타데이터 가져오기
  const metadata = await getVideoMetadata(inputPath);
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const originalAspectRatio = originalWidth / originalHeight;
  
  // 최대 크기 제한 (비율 유지)
  const maxWidth = 1280;
  const maxHeight = 1280;
  
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;
  
  // 가로 비디오인 경우 (16:9 등)
  if (originalAspectRatio >= 1) {
    if (originalWidth > maxWidth) {
      targetWidth = maxWidth;
      targetHeight = Math.round(maxWidth / originalAspectRatio);
    }
  } else {
    // 세로 비디오인 경우 (9:16 등)
    if (originalHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = Math.round(maxHeight * originalAspectRatio);
    }
  }
  
  // 짝수로 맞추기 (비디오 코덱 요구사항)
  targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
  targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset fast",
        "-crf 23", // Quality: lower is better, 23 is good balance
        "-movflags +faststart", // Enable streaming
        "-pix_fmt yuv420p", // Compatibility
        "-maxrate 2M", // Max bitrate
        "-bufsize 4M", // Buffer size
        "-map 0", // 모든 스트림 포함 (비디오 + 오디오)
        `-vf scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`, // 비율 유지하며 리사이즈
      ])
      .videoBitrate("1500k") // Video bitrate
      .audioBitrate("128k") // Audio bitrate
      .on("start", (commandLine) => {
        console.log("FFmpeg command:", commandLine);
        console.log(`Processing video: ${originalWidth}x${originalHeight} -> ${targetWidth}x${targetHeight}`);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`Processing: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => resolve(outputPath))
      .on("error", (err: Error) => {
        console.error("FFmpeg error:", err);
        reject(err);
      })
      .save(outputPath);
  });
}

export async function validateVideo(filePath: string): Promise<boolean> {
  try {
    await getVideoMetadata(filePath);
    return true;
  } catch {
    return false;
  }
}

