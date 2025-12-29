/**
 * Content Moderation Utilities
 * Basic validation and hooks for content moderation
 */

import { NextRequest, NextResponse } from "next/server";

interface ModerationResult {
  approved: boolean;
  reason?: string;
  confidence?: number;
}

/**
 * Basic text content moderation
 */
export async function moderateText(content: string): Promise<ModerationResult> {
  // List of blocked words/phrases (in production, use a proper moderation service)
  const blockedWords: string[] = [
    // Add your blocked words here
  ];

  const lowerContent = content.toLowerCase();

  for (const word of blockedWords) {
    if (lowerContent.includes(word.toLowerCase())) {
      return {
        approved: false,
        reason: "Content contains inappropriate language",
        confidence: 0.9,
      };
    }
  }

  // Check for spam patterns
  if (isSpam(content)) {
    return {
      approved: false,
      reason: "Content appears to be spam",
      confidence: 0.8,
    };
  }

  return {
    approved: true,
    confidence: 1.0,
  };
}

/**
 * Basic spam detection
 */
function isSpam(content: string): boolean {
  // Check for excessive links
  const linkPattern = /https?:\/\/[^\s]+/g;
  const links = content.match(linkPattern);
  if (links && links.length > 3) {
    return true;
  }

  // Check for excessive repetition
  const words = content.split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
    return true;
  }

  // Check for excessive capitalization
  const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (upperCaseRatio > 0.5 && content.length > 20) {
    return true;
  }

  return false;
}

/**
 * Video content validation
 */
export async function validateVideoContent(
  file: File,
  metadata?: { duration?: number; size?: number }
): Promise<ModerationResult> {
  // Check file size (max 100MB)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      approved: false,
      reason: "Video file is too large (max 100MB)",
    };
  }

  // Check duration (15-60 seconds for short-form)
  if (metadata?.duration) {
    if (metadata.duration < 15) {
      return {
        approved: false,
        reason: "Video is too short (minimum 15 seconds)",
      };
    }
    if (metadata.duration > 60) {
      return {
        approved: false,
        reason: "Video is too long (maximum 60 seconds)",
      };
    }
  }

  // Check file type
  const allowedTypes = ["video/mp4", "video/quicktime", "video/x-msvideo"];
  if (!allowedTypes.includes(file.type)) {
    return {
      approved: false,
      reason: "Invalid video format. Only MP4, MOV, and AVI are allowed",
    };
  }

  return {
    approved: true,
    confidence: 1.0,
  };
}

/**
 * Image content validation
 */
export async function validateImageContent(file: File): Promise<ModerationResult> {
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      approved: false,
      reason: "Image file is too large (max 5MB)",
    };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return {
      approved: false,
      reason: "Invalid image format",
    };
  }

  return {
    approved: true,
    confidence: 1.0,
  };
}

/**
 * Hook for content moderation (can be extended with AI services)
 */
export async function moderateContent(
  type: "text" | "video" | "image",
  content: string | File,
  metadata?: any
): Promise<ModerationResult> {
  switch (type) {
    case "text":
      return moderateText(content as string);
    case "video":
      return validateVideoContent(content as File, metadata);
    case "image":
      return validateImageContent(content as File);
    default:
      return {
        approved: false,
        reason: "Unknown content type",
      };
  }
}

