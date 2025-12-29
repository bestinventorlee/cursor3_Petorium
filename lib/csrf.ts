/**
 * CSRF Protection Utilities
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHmac } from "crypto";

const CSRF_SECRET = process.env.CSRF_SECRET || "change-this-in-production";
const CSRF_TOKEN_HEADER = "X-CSRF-Token";

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const token = randomBytes(32).toString("hex");
  const hmac = createHmac("sha256", CSRF_SECRET);
  hmac.update(token);
  const signature = hmac.digest("hex");
  return `${token}.${signature}`;
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string): boolean {
  if (!token) return false;

  const [tokenPart, signature] = token.split(".");
  if (!tokenPart || !signature) return false;

  const hmac = createHmac("sha256", CSRF_SECRET);
  hmac.update(tokenPart);
  const expectedSignature = hmac.digest("hex");

  return signature === expectedSignature;
}

/**
 * CSRF protection middleware
 */
export function validateCSRF(request: NextRequest): boolean {
  // Skip CSRF for GET requests
  if (request.method === "GET" || request.method === "HEAD") {
    return true;
  }

  const token = getCSRFToken(request);
  if (!token) {
    console.warn("CSRF token missing in request");
    return false;
  }

  const isValid = verifyCSRFToken(token);
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

