import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { uploadVideo as uploadVideoR2, uploadThumbnail as uploadThumbnailR2 } from "./cloudflare-r2";
import { uploadVideo as uploadVideoS3, uploadThumbnail as uploadThumbnailS3 } from "./s3";

// S3 또는 R2 사용 여부 결정
const useR2 = !!process.env.CLOUDFLARE_R2_BUCKET_NAME;

export interface UploadOptions {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Presigned URL을 생성하여 클라이언트에서 직접 업로드할 수 있도록 함
 * 현재는 서버 사이드 업로드를 사용하지만, 향후 확장 가능
 */
export async function generatePresignedUploadUrl(
  options: UploadOptions
): Promise<PresignedUrlResponse> {
  // 현재는 서버 사이드 업로드를 사용
  // 필요시 presigned URL 생성 로직 추가 가능
  throw new Error("Presigned URL 업로드는 아직 구현되지 않았습니다");
}

/**
 * 비디오 파일을 스토리지에 업로드
 */
export async function uploadVideoFile(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    // 개발 환경에서 스토리지 설정이 없으면 로컬 파일 시스템 사용
    if (process.env.NODE_ENV === "development" && !useR2 && !process.env.AWS_S3_BUCKET_NAME) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const publicDir = path.join(process.cwd(), "public", "uploads", "videos");
      await fs.mkdir(publicDir, { recursive: true });
      const filePath = path.join(publicDir, fileName);
      await fs.writeFile(filePath, buffer);
      return `/uploads/videos/${fileName}`;
    }

    if (useR2) {
      if (!process.env.CLOUDFLARE_R2_BUCKET_NAME) {
        throw new Error("CLOUDFLARE_R2_BUCKET_NAME 환경 변수가 설정되지 않았습니다");
      }
      return await uploadVideoR2(buffer, fileName, contentType);
    } else {
      if (!process.env.AWS_S3_BUCKET_NAME) {
        throw new Error("AWS_S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다");
      }
      return await uploadVideoS3(buffer, fileName, contentType);
    }
  } catch (error: any) {
    console.error("Error uploading video:", error);
    console.error("Error details:", {
      useR2,
      hasR2Bucket: !!process.env.CLOUDFLARE_R2_BUCKET_NAME,
      hasS3Bucket: !!process.env.AWS_S3_BUCKET_NAME,
    });
    throw new Error(error.message || "비디오 업로드 중 오류가 발생했습니다");
  }
}

/**
 * 썸네일 이미지를 스토리지에 업로드
 */
export async function uploadThumbnailFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  try {
    // 개발 환경에서 스토리지 설정이 없으면 로컬 파일 시스템 사용
    if (process.env.NODE_ENV === "development" && !useR2 && !process.env.AWS_S3_BUCKET_NAME) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const publicDir = path.join(process.cwd(), "public", "uploads", "thumbnails");
      await fs.mkdir(publicDir, { recursive: true });
      const filePath = path.join(publicDir, fileName);
      await fs.writeFile(filePath, buffer);
      return `/uploads/thumbnails/${fileName}`;
    }

    if (useR2) {
      if (!process.env.CLOUDFLARE_R2_BUCKET_NAME) {
        throw new Error("CLOUDFLARE_R2_BUCKET_NAME 환경 변수가 설정되지 않았습니다");
      }
      return await uploadThumbnailR2(buffer, fileName);
    } else {
      if (!process.env.AWS_S3_BUCKET_NAME) {
        throw new Error("AWS_S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다");
      }
      return await uploadThumbnailS3(buffer, fileName);
    }
  } catch (error: any) {
    console.error("Error uploading thumbnail:", error);
    console.error("Error details:", {
      useR2,
      hasR2Bucket: !!process.env.CLOUDFLARE_R2_BUCKET_NAME,
      hasS3Bucket: !!process.env.AWS_S3_BUCKET_NAME,
    });
    throw new Error(error.message || "썸네일 업로드 중 오류가 발생했습니다");
  }
}

/**
 * 재시도 로직이 포함된 업로드 함수
 */
export async function uploadWithRetry<T>(
  uploadFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFn();
    } catch (error: any) {
      lastError = error;
      console.error(`Upload attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const backoffDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Retrying in ${backoffDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError || new Error("업로드 실패");
}

