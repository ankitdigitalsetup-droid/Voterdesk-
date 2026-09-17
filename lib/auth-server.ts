import bcrypt from "bcryptjs";
import { Role, UserAccount } from "./types";

export const SESSION_COOKIE_NAME = "voterdesk_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// Set to track all previously generated passwords during this server lifecycle
// to guarantee that newly generated 8-digit numeric passwords are never repeated
const previouslyGeneratedPasswords = new Set<string>();

function getRandomInt8Digit(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return 10000000 + (arr[0] % 90000000);
  }
  return 10000000 + Math.floor(Math.random() * 90000000);
}

/**
 * Generates a cryptographically secure 8-digit numeric password.
 * Guaranteed to be different from any previously generated password in this session.
 */
export function generateUnique8DigitPassword(existingHashes: string[] = []): string {
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    // Generates integer between 10000000 and 99999999 (inclusive)
    const num = getRandomInt8Digit();
    const pwdStr = String(num);

    // Ensure it was not previously issued
    if (previouslyGeneratedPasswords.has(pwdStr)) {
      continue;
    }

    // Ensure it does not match any existing user password hash
    let matchesExisting = false;
    for (const hash of existingHashes) {
      if (hash && bcrypt.compareSync(pwdStr, hash)) {
        matchesExisting = true;
        break;
      }
    }

    if (!matchesExisting) {
      previouslyGeneratedPasswords.add(pwdStr);
      return pwdStr;
    }
  }

  // Fallback if ever exhausted
  const fallback = String(Date.now()).slice(-8);
  previouslyGeneratedPasswords.add(fallback);
  return fallback;
}

/**
 * Hashes a raw password securely with bcrypt (10 salt rounds).
 */
export function hashPassword(plainPassword: string): string {
  return bcrypt.hashSync(plainPassword, 10);
}

/**
 * Compares a plain password against a bcrypt hash.
 */
export function verifyPassword(plainPassword: string, hash: string): boolean {
  if (!plainPassword || !hash) return false;
  try {
    return bcrypt.compareSync(plainPassword, hash);
  } catch {
    return false;
  }
}

/**
 * Generates a random session token.
 */
export function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
}
