import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";

export async function uploadVideo(file: Buffer, fileName: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `videos/${fileName}`,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/videos/${fileName}`;
}

export async function uploadThumbnail(file: Buffer, fileName: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `thumbnails/${fileName}`,
    Body: file,
    ContentType: "image/jpeg",
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/thumbnails/${fileName}`;
}

export async function getSignedVideoUrl(key: string, expiresIn: number = 3600) {
  // Presigned URL은 나중에 필요시 구현
  // 현재는 공개 URL 반환
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function deleteVideo(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

