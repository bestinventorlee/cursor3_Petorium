import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
  generateThumbnails,
  getVideoMetadata,
  processVideo,
} from "@/lib/video-processing";
import {
  uploadVideoFile,
  uploadThumbnailFile,
  uploadWithRetry,
} from "@/lib/storage";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_DURATION = 15; // seconds
const MAX_DURATION = 60; // seconds
const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  let processedFilePath: string | null = null;
  let thumbnailPaths: string[] = [];

  try {
    const userId = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get("video") as File;
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || null;

    // 입력 검증
    if (!file) {
      return NextResponse.json(
        { error: "비디오 파일이 필요합니다" },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "제목이 필요합니다" },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        { error: "제목은 최대 100자까지 가능합니다" },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "설명은 최대 500자까지 가능합니다" },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기는 최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB까지 가능합니다` },
        { status: 400 }
      );
    }

    // 임시 디렉토리 생성
    const uploadDir = join(process.cwd(), "tmp", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    tempFilePath = join(uploadDir, fileName);

    await writeFile(tempFilePath, buffer);

    try {
      // 비디오 메타데이터 가져오기 (빠른 검증만)
      const metadata = await getVideoMetadata(tempFilePath);

      // 길이 검증
      if (metadata.duration < MIN_DURATION) {
        throw new Error(`비디오 길이는 최소 ${MIN_DURATION}초 이상이어야 합니다`);
      }
      if (metadata.duration > MAX_DURATION) {
        throw new Error(`비디오 길이는 최대 ${MAX_DURATION}초까지 가능합니다`);
      }

      // 즉시 데이터베이스에 저장 (처리 중 상태)
      const video = await prisma.video.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          videoUrl: `processing://${timestamp}`, // 임시 URL (처리 완료 후 업데이트)
          thumbnailUrl: null, // 처리 완료 후 업데이트
          duration: Math.round(metadata.duration),
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // 즉시 응답 반환 (비동기 처리 시작)
      // 백그라운드에서 처리 시작 (await 없이 실행)
      processVideoAsync(
        video.id,
        tempFilePath,
        uploadDir,
        timestamp,
        fileName,
        metadata
      ).catch((error) => {
        console.error(`비동기 비디오 처리 실패 (videoId: ${video.id}):`, error);
        // 오류 발생 시 비디오 삭제 또는 상태 업데이트
        prisma.video.delete({ where: { id: video.id } }).catch(console.error);
      });

      return NextResponse.json(
        {
          message: "비디오 업로드가 시작되었습니다. 처리 중입니다...",
          videoId: video.id,
          video: {
            id: video.id,
            title: video.title,
            description: video.description,
            videoUrl: null, // 처리 중
            thumbnailUrl: null, // 처리 중
            duration: video.duration,
            user: video.user,
            processing: true, // 처리 중 플래그
          },
        },
        { status: 201 }
      );
    } catch (error: any) {
      // 임시 파일 삭제
      await cleanupFiles([
        tempFilePath,
        processedFilePath,
        ...thumbnailPaths,
      ].filter(Boolean) as string[]);

      console.error("Error processing video:", error);
      console.error("Error stack:", error.stack);
      return NextResponse.json(
        {
          error:
            error.message ||
            "비디오 처리 중 오류가 발생했습니다. 파일 형식과 길이를 확인해주세요.",
          details: process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // 임시 파일 삭제
    await cleanupFiles([
      tempFilePath,
      processedFilePath,
      ...thumbnailPaths,
    ].filter(Boolean) as string[]);

    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Error uploading video:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: "비디오 업로드 중 오류가 발생했습니다",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// 비동기 비디오 처리 함수
async function processVideoAsync(
  videoId: string,
  tempFilePath: string,
  uploadDir: string,
  timestamp: number,
  fileName: string,
  metadata: { duration: number; width: number; height: number; size: number; hasAudio?: boolean }
) {
  let processedFilePath: string | null = null;
  let thumbnailPaths: string[] = [];

  try {
    // 비디오 압축 및 처리
    const processedFileName = `processed-${fileName}`;
    processedFilePath = join(uploadDir, processedFileName);
    await processVideo(tempFilePath, processedFilePath);

    // 썸네일 생성 (1개만 - 첫 번째 프레임)
    const thumbnailTimestamps = [1];
    thumbnailPaths = await generateThumbnails(
      processedFilePath,
      uploadDir,
      `thumbnail-${timestamp}`,
      thumbnailTimestamps
    );

    // 처리된 비디오 및 썸네일 읽기
    const processedBuffer = await readFile(processedFilePath);
    
    // 썸네일 파일 읽기
    const thumbnailBuffers = await Promise.all(
      thumbnailPaths.map(async (thumbnailPath) => {
        try {
          return await readFile(thumbnailPath);
        } catch (error: any) {
          console.error(`Failed to read thumbnail at ${thumbnailPath}:`, error);
          throw new Error(`썸네일 파일을 읽을 수 없습니다: ${thumbnailPath}`);
        })
      })
    );
    
    if (thumbnailBuffers.length === 0) {
      throw new Error("썸네일이 생성되지 않았습니다");
    }

    // S3 또는 R2에 업로드 (재시도 로직 포함)
    const videoFileName = `video-${timestamp}.mp4`;
    const videoUrl = await uploadWithRetry(
      () => uploadVideoFile(processedBuffer, videoFileName, "video/mp4"),
      MAX_RETRIES
    );

    // 첫 번째 썸네일을 메인 썸네일로 사용
    const thumbnailFileName = `thumbnail-${timestamp}-0.jpg`;
    const thumbnailUrl = await uploadWithRetry(
      () => uploadThumbnailFile(thumbnailBuffers[0], thumbnailFileName),
      MAX_RETRIES
    );

    // 데이터베이스 업데이트 (처리 완료)
    await prisma.video.update({
      where: { id: videoId },
      data: {
        videoUrl,
        thumbnailUrl,
      },
    });

    // 임시 파일 삭제
    await cleanupFiles([
      tempFilePath,
      processedFilePath,
      ...thumbnailPaths,
    ]);

    console.log(`비디오 처리 완료: ${videoId}`);
  } catch (error: any) {
    // 오류 발생 시 임시 파일 삭제
    await cleanupFiles([
      tempFilePath,
      processedFilePath,
      ...thumbnailPaths,
    ].filter(Boolean) as string[]);

    console.error(`비디오 처리 오류 (videoId: ${videoId}):`, error);
    throw error;
  }
}

async function cleanupFiles(filePaths: string[]) {
  await Promise.allSettled(
    filePaths
      .filter(Boolean) // null/undefined 제거
      .map((filePath) =>
        unlink(filePath).catch((err) => {
          // 파일이 없으면 무시 (이미 삭제되었거나 생성되지 않았을 수 있음)
          if (err.code !== "ENOENT") {
            console.error(`Failed to delete file ${filePath}:`, err);
          }
        })
      )
  );
}

