/**
 * ============================================================================
 * 🛡️ VOTERDESK IN-MEMORY API RATE LIMITER (lib/rate-limit.ts)
 * ============================================================================
 * Protects endpoints against brute-force attacks, scraping, and DoS storms.
 * Uses a memory-efficient sliding-window algorithm with automatic garbage collection.
 * ============================================================================
 */

import { NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      // Remove timestamps older than 10 minutes
      record.timestamps = record.timestamps.filter((t) => now - t < 600000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}

export interface RateLimitOptions {
  limit: number; // Max allowed requests
  windowMs: number; // Time window in milliseconds
  identifier?: string; // Custom identifier (e.g. IP, phone, userId)
}

/**
 * Checks whether a request exceeds the configured rate limit.
 * Returns { success: true, remaining, resetTime } or { success: false, retryAfterSeconds }
 */
export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): { success: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - options.windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter out expired timestamps
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= options.limit) {
    const oldest = record.timestamps[0];
    const retryAfterMs = oldest + options.windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: options.limit - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Extracts client IP address safely from standard request headers.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

/**
 * Helper to generate a 429 Too Many Requests response with standard headers.
 */
export function rateLimitResponse(retryAfterSeconds: number, message = "Too many requests. Please try again later."): NextResponse {
  return NextResponse.json(
    {
      error: "Too Many Requests (बहुत अधिक प्रयास)",
      message: `${message} Retry after ${retryAfterSeconds} seconds.`,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
