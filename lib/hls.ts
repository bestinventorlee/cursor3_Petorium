/**
 * HLS (HTTP Live Streaming) Utilities
 * For adaptive bitrate streaming
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

const execAsync = promisify(exec);

interface HLSConfig {
  outputDir: string;
  segmentDuration?: number;
  playlistName?: string;
  bitrates?: number[];
}

/**
 * Generate HLS playlist and segments from video
 */
export async function generateHLS(
  inputPath: string,
  config: HLSConfig
): Promise<{
  masterPlaylist: string;
  playlists: string[];
  segments: string[];
}> {
  const {
    outputDir,
    segmentDuration = 10,
    playlistName = "playlist.m3u8",
    bitrates = [240, 480, 720, 1080],
  } = config;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const playlists: string[] = [];
  const allSegments: string[] = [];

  // Generate master playlist
  const masterPlaylistPath = path.join(outputDir, playlistName);
  let masterPlaylistContent = "#EXTM3U\n#EXT-X-VERSION:3\n";

  // Generate playlists for each bitrate
  for (const bitrate of bitrates) {
    const resolution = getResolutionForBitrate(bitrate);
    const playlistPath = path.join(outputDir, `playlist_${bitrate}.m3u8`);
    const segmentPattern = path.join(outputDir, `segment_${bitrate}_%03d.ts`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(ffmpegStatic || "ffmpeg")
        .videoCodec("libx264")
        .audioCodec("aac")
        .addOption("-hls_time", segmentDuration.toString())
        .addOption("-hls_list_size", "0")
        .addOption("-hls_segment_filename", segmentPattern)
        .addOption("-hls_flags", "independent_segments")
        .size(`${resolution.width}x${resolution.height}`)
        .videoBitrate(`${bitrate}k`)
        .output(playlistPath)
        .on("end", () => {
          playlists.push(playlistPath);
          resolve();
        })
        .on("error", reject)
        .run();
    });

    // Get generated segments
    const segments = await getSegmentsFromPlaylist(playlistPath);
    allSegments.push(...segments);

    // Add to master playlist
    masterPlaylistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bitrate * 1000},RESOLUTION=${resolution.width}x${resolution.height}\n`;
    masterPlaylistContent += `playlist_${bitrate}.m3u8\n`;
  }

  // Write master playlist
  await fs.writeFile(masterPlaylistPath, masterPlaylistContent);

  return {
    masterPlaylist: masterPlaylistPath,
    playlists,
    segments: allSegments,
  };
}

function getResolutionForBitrate(bitrate: number): { width: number; height: number } {
  switch (bitrate) {
    case 240:
      return { width: 426, height: 240 };
    case 480:
      return { width: 854, height: 480 };
    case 720:
      return { width: 1280, height: 720 };
    case 1080:
      return { width: 1920, height: 1080 };
    default:
      return { width: 854, height: 480 };
  }
}

async function getSegmentsFromPlaylist(playlistPath: string): Promise<string[]> {
  const content = await fs.readFile(playlistPath, "utf-8");
  const lines = content.split("\n");
  const segments: string[] = [];

  for (const line of lines) {
    if (line.endsWith(".ts") && !line.startsWith("#")) {
      const segmentPath = path.join(path.dirname(playlistPath), line);
      segments.push(segmentPath);
    }
  }

  return segments;
}

/**
 * Generate thumbnail sprite for video scrubbing
 */
export async function generateThumbnailSprite(
  inputPath: string,
  outputPath: string,
  options?: {
    columns?: number;
    rows?: number;
    interval?: number;
  }
): Promise<{
  spritePath: string;
  vttPath: string;
  thumbnailCount: number;
}> {
  const { columns = 10, rows = 10, interval = 1 } = options || {};
  const totalThumbnails = columns * rows;
  const tempDir = path.join(path.dirname(outputPath), "thumbnails_temp");
  
  await fs.mkdir(tempDir, { recursive: true });

  // Get video duration
  const duration = await getVideoDuration(inputPath);
  const thumbnailInterval = Math.max(interval, duration / totalThumbnails);

  // Generate individual thumbnails
  const thumbnails: string[] = [];
  for (let i = 0; i < totalThumbnails; i++) {
    const time = i * thumbnailInterval;
    const thumbnailPath = path.join(tempDir, `thumb_${i.toString().padStart(4, "0")}.jpg`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setFfmpegPath(ffmpegStatic || "ffmpeg")
        .seekInput(time)
        .frames(1)
        .size("160x90")
        .output(thumbnailPath)
        .on("end", () => {
          thumbnails.push(thumbnailPath);
          resolve();
        })
        .on("error", reject)
        .run();
    });
  }

  // Create sprite using ImageMagick or similar tool
  // For now, we'll use a simple grid layout
  const spritePath = outputPath.replace(/\.[^/.]+$/, "_sprite.jpg");
  const vttPath = outputPath.replace(/\.[^/.]+$/, "_sprite.vtt");

  // Generate VTT file for video scrubbing
  const vttContent = generateVTT(thumbnails, columns, rows, duration);
  await fs.writeFile(vttPath, vttContent);

  // Note: Actual sprite generation would require ImageMagick or similar
  // This is a placeholder - you'd need to implement actual sprite creation
  // For production, consider using a library like `sharp` or `jimp`

  return {
    spritePath,
    vttPath,
    thumbnailCount: thumbnails.length,
  };
}

function generateVTT(
  thumbnails: string[],
  columns: number,
  rows: number,
  duration: number
): string {
  let vtt = "WEBVTT\n\n";
  const thumbnailWidth = 160;
  const thumbnailHeight = 90;
  const spriteWidth = thumbnailWidth * columns;
  const spriteHeight = thumbnailHeight * rows;

  thumbnails.forEach((_, index) => {
    const time = (index / thumbnails.length) * duration;
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = col * thumbnailWidth;
    const y = row * thumbnailHeight;
    const endTime = Math.min(((index + 1) / thumbnails.length) * duration, duration);

    vtt += `${formatTime(time)} --> ${formatTime(endTime)}\n`;
    vtt += `sprite.jpg#xywh=${x},${y},${thumbnailWidth},${thumbnailHeight}\n\n`;
  });

  return vtt;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 0);
    });
  });
}

