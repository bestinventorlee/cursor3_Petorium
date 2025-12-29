import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";

export async function uploadVideo(file: Buffer, fileName: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `videos/${fileName}`,
    Body: file,
    ContentType: contentType,
  });

  await r2Client.send(command);
  return `${PUBLIC_URL}/videos/${fileName}`;
}

export async function uploadThumbnail(file: Buffer, fileName: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `thumbnails/${fileName}`,
    Body: file,
    ContentType: "image/jpeg",
  });

  await r2Client.send(command);
  return `${PUBLIC_URL}/thumbnails/${fileName}`;
}

export async function getSignedVideoUrl(key: string, expiresIn: number = 3600) {
  // Presigned URL은 나중에 필요시 구현
  // 현재는 공개 URL 반환
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteVideo(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

