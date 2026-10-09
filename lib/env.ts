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
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  SUPER_ADMIN_PASSWORD?: string;
}

/**
 * Validates and returns the loaded environment variables.
 */
export function getEnv(): AppEnv {
  const DATABASE_URL = process.env.DATABASE_URL || "";
  const DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || DATABASE_URL;
  const SESSION_SECRET = process.env.SESSION_SECRET || "voterdesk-super-secure-session-key-2026";
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const NEXT_PUBLIC_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "VoterDesk";
  const NODE_ENV = (process.env.NODE_ENV as AppEnv["NODE_ENV"]) || "development";
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "voterdesk2026";
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

  return {
    DATABASE_URL,
    DIRECT_URL,
    SESSION_SECRET,
    NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME,
    NODE_ENV,
    isProduction: NODE_ENV === "production",
    isDevelopment: NODE_ENV === "development",
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
    SUPER_ADMIN_PASSWORD,
  };
}

/**
 * Health check validation for required environment variables.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push("Missing DATABASE_URL: PostgreSQL database connection string is required.");
  }

  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === "production") {
      errors.push("Missing SESSION_SECRET: Required in production for session token encryption.");
    } else {
      warnings.push("Default SESSION_SECRET in use. Set a custom secret in production.");
    }
  } else if (process.env.SESSION_SECRET.length < 32 && process.env.NODE_ENV === "production") {
    warnings.push("SESSION_SECRET is shorter than 32 characters. Consider using a 32+ character random string.");
  }

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    warnings.push("Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not fully configured.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export const env = getEnv();
