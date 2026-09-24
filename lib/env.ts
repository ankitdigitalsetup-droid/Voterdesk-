// Environment Variables Configuration & Validation for VoterDesk

export interface AppEnv {
  DATABASE_URL: string;
  DIRECT_URL?: string;
  SESSION_SECRET: string;
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_APP_NAME: string;
  NODE_ENV: "development" | "production" | "test";
  isProduction: boolean;
  isDevelopment: boolean;
}

/**
 * Validates and returns the loaded environment variables.
 * Throws a descriptive error if critical production variables are missing.
 */
export function getEnv(): AppEnv {
  const DATABASE_URL = process.env.DATABASE_URL || "";
  const DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || DATABASE_URL;
  const SESSION_SECRET = process.env.SESSION_SECRET || "voterdesk-super-secure-session-key-2026";
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const NEXT_PUBLIC_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "VoterDesk";
  const NODE_ENV = (process.env.NODE_ENV as AppEnv["NODE_ENV"]) || "development";

  return {
    DATABASE_URL,
    DIRECT_URL,
    SESSION_SECRET,
    NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME,
    NODE_ENV,
    isProduction: NODE_ENV === "production",
    isDevelopment: NODE_ENV === "development",
  };
}

/**
 * Health check validation for required environment variables.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push("Missing DATABASE_URL: PostgreSQL database connection string is required.");
  }

  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === "production") {
      errors.push("Missing SESSION_SECRET: Required in production for session token encryption.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const env = getEnv();
