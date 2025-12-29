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
  hasAudio?: boolean; // 오디오 스트림 존재 여부
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

      const audioStream = metadata.streams.find((s: any) => s.codec_type === "audio");
      const hasAudio = audioStream !== undefined;

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        size: metadata.format.size || 0,
        hasAudio,
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
  
  // 원본이 이미 적절한 크기이고 형식이 맞으면 변환 건너뛰기
  if (
    originalWidth === targetWidth &&
    originalHeight === targetHeight &&
    originalWidth <= maxWidth &&
    originalHeight <= maxHeight
  ) {
    console.log("원본 비디오가 이미 적절한 크기입니다. 변환을 건너뜁니다.");
    // 원본 파일을 그대로 복사
    const fs = require("fs/promises");
    await fs.copyFile(inputPath, outputPath);
    return outputPath;
  }
  
  return new Promise((resolve, reject) => {
    // 비디오 메타데이터에서 오디오 스트림 존재 여부 확인
    const hasAudio = metadata.hasAudio === true;
    
    console.log(`Video processing: ${originalWidth}x${originalHeight} -> ${targetWidth}x${targetHeight}, hasAudio: ${hasAudio}`);
    
    // FFmpeg scale 필터: 비율 유지하며 리사이즈하고, 결과를 짝수로 맞춤
    // -2는 비율을 유지하면서 짝수로 자동 조정 (더 안전한 방법)
    // 가로 비디오인 경우 높이를 -2로, 세로 비디오인 경우 너비를 -2로 설정
    const scaleFilter = originalAspectRatio >= 1
      ? `scale=${targetWidth}:-2:force_original_aspect_ratio=decrease` // 가로 비디오: 너비 고정, 높이 자동(짝수)
      : `scale=-2:${targetHeight}:force_original_aspect_ratio=decrease`; // 세로 비디오: 높이 고정, 너비 자동(짝수)
    
    const command = ffmpeg(inputPath)
      .videoCodec("libx264")
      .outputOptions([
        "-preset veryfast", // fast → veryfast로 변경 (약 2-3배 빠름, 약간의 품질 손실)
        "-crf 23", // Quality: lower is better, 23 is good balance
        "-movflags +faststart", // Enable streaming
        "-pix_fmt yuv420p", // Compatibility
        "-maxrate 2M", // Max bitrate
        "-bufsize 4M", // Buffer size
        `-vf ${scaleFilter}`, // 비율 유지하며 리사이즈하고 짝수로 맞춤
        "-threads 0", // 모든 CPU 코어 사용
      ])
      .videoBitrate("1500k"); // Video bitrate
    
    // 오디오가 있는 경우에만 오디오 처리 옵션 추가
    if (hasAudio) {
      command
        .audioCodec("aac")
        .audioBitrate("128k");
    } else {
      // 오디오가 없으면 오디오 스트림을 생성하지 않음
      command.outputOptions(["-an"]); // 오디오 없음
    }
    
    // stderr 출력 캡처 (FFmpeg의 상세 오류 메시지)
    let stderrOutput = "";
    
    command
      .on("start", (commandLine) => {
        console.log("FFmpeg command:", commandLine);
        console.log(`Processing video: ${originalWidth}x${originalHeight} -> ${targetWidth}x${targetHeight}, hasAudio: ${hasAudio}`);
      })
      .on("stderr", (stderrLine: string) => {
        stderrOutput += stderrLine + "\n";
        // 경고는 로그만 출력
        if (stderrLine.includes("warning") || stderrLine.includes("Warning")) {
          console.warn("FFmpeg warning:", stderrLine);
        } else if (stderrLine.includes("error") || stderrLine.includes("Error")) {
          console.error("FFmpeg stderr error:", stderrLine);
        }
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`Processing: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        console.log("FFmpeg processing completed successfully");
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        console.error("FFmpeg error:", err);
        console.error("FFmpeg stderr output:", stderrOutput);
        reject(new Error(`FFmpeg 변환 실패: ${err.message}\nStderr: ${stderrOutput}`));
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

