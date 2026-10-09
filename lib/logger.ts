/**
 * Production Structured Logger for VoterDesk
 * Provides JSON-formatted structured logging for serverless and Node.js environments.
 */

type LogLevel = "INFO" | "WARN" | "ERROR" | "AUDIT";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sanitized = { ...meta };

  // Strip sensitive keys to protect voter privacy and system credentials
  const sensitiveKeys = ["password", "token", "secret", "cookie", "sessionSecret", "accessKeyId", "secretAccessKey"];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    }
  }
  return sanitized;
}

function formatLog(level: LogLevel, message: string, context?: Record<string, unknown>, err?: unknown): string {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: sanitizeMeta(context),
  };

  if (err instanceof Error) {
    payload.error = {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
  } else if (err) {
    payload.error = {
      message: String(err),
    };
  }

  return JSON.stringify(payload);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(formatLog("INFO", message, context));
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(formatLog("WARN", message, context));
  },

  error: (message: string, err?: unknown, context?: Record<string, unknown>) => {
    console.error(formatLog("ERROR", message, context, err));
  },

  audit: (action: string, user: { id?: string; role?: string; name?: string }, details?: Record<string, unknown>) => {
    console.log(
      formatLog("AUDIT", action, {
        user: { id: user.id, role: user.role, name: user.name },
        ...details,
      })
    );
  },
};
