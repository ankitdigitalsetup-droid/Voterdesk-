import crypto from "crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export interface SessionPayload {
  userId: string;
  phone: string;
  name: string;
  role: "SUPER_ADMIN" | "CANDIDATE_ADMIN" | "KARYAKARTA";
  candidateId?: string | null;
  assignedBooths?: string[];
  exp: number; // Expiration timestamp in seconds
}

export const SESSION_COOKIE_NAME = "voterdesk_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString();
}

/**
 * Creates a cryptographically signed session token.
 */
export function createSessionToken(
  user: Omit<SessionPayload, "exp">,
  expiresInSeconds = SESSION_DURATION_SECONDS
): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload: SessionPayload = { ...user, exp };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token || !token.includes(".")) return null;

    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", env.SESSION_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const payload: SessionPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Sets the secure session cookie on a NextResponse object.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Clears the session cookie on a NextResponse object.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Extracts and verifies session token from Request cookies or Authorization header.
 */
export function getSessionFromRequest(request: Request): SessionPayload | null {
  // 1. Try Cookie header
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k, v.join("=")];
      })
    );
    const token = cookies[SESSION_COOKIE_NAME];
    if (token) {
      const session = verifySessionToken(token);
      if (session) return session;
    }
  }

  // 2. Try Authorization Bearer header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    return verifySessionToken(token);
  }

  return null;
}
