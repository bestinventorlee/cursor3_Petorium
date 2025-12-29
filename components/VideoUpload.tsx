"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface VideoUploadProps {
  onUploadComplete?: (videoId: string) => void;
  onUploadError?: (error: string) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FORMATS = ["video/mp4", "video/quicktime", "video/x-msvideo"]; // mp4, mov, avi
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi"];
const MIN_DURATION = 15; // seconds
const MAX_DURATION = 60; // seconds

export default function VideoUpload({
  onUploadComplete,
  onUploadError,
}: VideoUploadProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const validateFile = useCallback((file: File): string | null => {
    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기는 최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB까지 가능합니다`;
    }

    // 파일 형식 검증
    const isValidFormat = ALLOWED_FORMATS.includes(file.type) ||
      ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValidFormat) {
      return "지원되는 형식: MP4, MOV, AVI";
    }

    return null;
  }, []);

  const validateDuration = useCallback((duration: number): string | null => {
    if (duration < MIN_DURATION) {
      return `비디오 길이는 최소 ${MIN_DURATION}초 이상이어야 합니다`;
    }
    if (duration > MAX_DURATION) {
      return `비디오 길이는 최대 ${MAX_DURATION}초까지 가능합니다`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setError(null);
      setProgress(0);

      // 파일 검증
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }

      setFile(selectedFile);

      // 미리보기 생성
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);

      // 비디오 길이 확인
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = previewUrl;

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(previewUrl);
        const videoDuration = video.duration;

        const durationError = validateDuration(videoDuration);
        if (durationError) {
          setError(durationError);
          setFile(null);
          setPreview(null);
          return;
        }

        setDuration(videoDuration);
      };

      video.onerror = () => {
        setError("비디오 파일을 읽을 수 없습니다");
        setFile(null);
        setPreview(null);
      };
    },
    [validateFile, validateDuration]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const uploadWithRetry = useCallback(
    async (formData: FormData, retries = 0): Promise<Response> => {
      try {
        // fetch API를 사용하여 업로드 진행률 추적
        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              setProgress(percentComplete);
            }
          });

          xhr.addEventListener("load", () => {
            // XMLHttpRequest 응답을 Response 객체로 변환
            const response = new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers(),
            });
            
            // Response 객체에 ok 속성 추가
            Object.defineProperty(response, 'ok', {
              value: xhr.status >= 200 && xhr.status < 300,
              writable: false,
            });

            // Response 객체에 json 메서드 추가
            if (xhr.responseText) {
              try {
                const json = JSON.parse(xhr.responseText);
                Object.defineProperty(response, 'json', {
                  value: async () => json,
                  writable: false,
                });
              } catch {
                // JSON 파싱 실패 시 빈 객체 반환
                Object.defineProperty(response, 'json', {
                  value: async () => ({}),
                  writable: false,
                });
              }
            } else {
              Object.defineProperty(response, 'json', {
                value: async () => ({}),
                writable: false,
              });
            }

            resolve(response);
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload aborted"));
          });

          xhr.open("POST", "/api/videos/upload");
          xhr.send(formData);
        });
      } catch (error) {
        if (retries < MAX_RETRIES) {
          console.log(`Retrying upload (${retries + 1}/${MAX_RETRIES})...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retries + 1))); // Exponential backoff
          return uploadWithRetry(formData, retries + 1);
        }
        throw error;
      }
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!file || !user) {
      setError("파일을 선택하고 로그인해주세요");
      return;
    }

    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);
    retryCountRef.current = 0;

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", title);
      if (description.trim()) {
        formData.append("description", description);
      }

      const response = await uploadWithRetry(formData);

      if (!response.ok) {
        let errorMessage = "업로드 중 오류가 발생했습니다";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // JSON 파싱 실패 시 기본 메시지 사용
          console.error("Error parsing response:", parseError);
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing success response:", parseError);
        throw new Error("서버 응답을 처리할 수 없습니다");
      }

      // 성공
      setProgress(100);
      if (onUploadComplete && data.videoId) {
        onUploadComplete(data.videoId);
      }

      // 폼 초기화
      setFile(null);
      setPreview(null);
      setTitle("");
      setDescription("");
      setDuration(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      const errorMessage = err.message || "업로드 중 오류가 발생했습니다";
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [file, title, description, user, uploadWithRetry, onUploadComplete, onUploadError]);

  const handleRemove = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setDuration(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [preview]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 드래그 앤 드롭 영역 */}
      {!file && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,.mp4,.mov,.avi"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                비디오를 드래그하여 놓거나 클릭하여 선택
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                MP4, MOV, AVI (최대 100MB, 15-60초)
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              파일 선택
            </button>
          </div>
        </div>
      )}

      {/* 파일 선택 후 미리보기 */}
      {file && preview && (
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={preview}
              controls
              className="w-full max-h-96"
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition"
              aria-label="파일 제거"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">파일명:</span>
              <span className="font-medium">{file.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">크기:</span>
              <span className="font-medium">{formatFileSize(file.size)}</span>
            </div>
            {duration && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">길이:</span>
                <span className="font-medium">{formatDuration(duration)}</span>
              </div>
            )}
          </div>

          {/* 제목 및 설명 입력 */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                제목 *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="비디오 제목을 입력하세요"
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                설명 (선택)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="비디오에 대한 설명을 입력하세요"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
              />
            </div>
          </div>

          {/* 진행률 표시줄 */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  업로드 중...
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* 업로드 버튼 */}
          <div className="flex space-x-4">
            <button
              onClick={handleUpload}
              disabled={uploading || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "업로드 중..." : "업로드"}
            </button>
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

