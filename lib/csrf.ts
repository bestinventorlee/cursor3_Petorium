/**
 * CSRF Protection Utilities
 * Edge Runtime compatible (uses Web Crypto API)
 */

import { NextRequest, NextResponse } from "next/server";

const CSRF_SECRET = process.env.CSRF_SECRET || "change-this-in-production";
const CSRF_TOKEN_HEADER = "X-CSRF-Token";

/**
 * Generate random bytes (Edge Runtime compatible)
 */
async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const array = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js (should not be used in Edge Runtime)
    const { randomBytes } = require("crypto");
    const bytes = randomBytes(length);
    array.set(bytes);
  }
  return array;
}

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(array: Uint8Array): string {
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create HMAC signature (Edge Runtime compatible)
 */
async function createHMAC(data: string, secret: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    // Web Crypto API (Edge Runtime)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    return uint8ArrayToHex(new Uint8Array(signature));
  } else {
    // Fallback for Node.js
    const { createHmac } = require("crypto");
    const hmac = createHmac("sha256", secret);
    hmac.update(data);
    return hmac.digest("hex");
  }
}

/**
 * Generate CSRF token (Edge Runtime compatible)
 */
export async function generateCSRFToken(): Promise<string> {
  const tokenBytes = await generateRandomBytes(32);
  const token = uint8ArrayToHex(tokenBytes);
  const signature = await createHMAC(token, CSRF_SECRET);
  return `${token}.${signature}`;
}

/**
 * Verify CSRF token (Edge Runtime compatible)
 */
export async function verifyCSRFToken(token: string): Promise<boolean> {
  if (!token) return false;

  const [tokenPart, signature] = token.split(".");
  if (!tokenPart || !signature) return false;

  const expectedSignature = await createHMAC(tokenPart, CSRF_SECRET);
  return signature === expectedSignature;
}

/**
 * CSRF protection middleware (Edge Runtime compatible)
 */
export async function validateCSRF(request: NextRequest): Promise<boolean> {
  // Skip CSRF for GET requests
  if (request.method === "GET" || request.method === "HEAD") {
    return true;
  }

  const token = getCSRFToken(request);
  if (!token) {
    console.warn("CSRF token missing in request");
    return false;
  }

  const isValid = await verifyCSRFToken(token);
  if (!isValid) {
    console.warn("CSRF token validation failed");
  }

  return isValid;
}

/**
 * Get CSRF token from request
 */
export function getCSRFToken(request: NextRequest): string | null {
  return request.headers.get(CSRF_TOKEN_HEADER);
}

