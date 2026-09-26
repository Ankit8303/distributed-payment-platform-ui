/**
 * Safe client-side telemetry logger.
 * Invariant: Never log passwords, bearer tokens, or PAN/CVV information.
 */

const REDACTED_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "authorization",
  "cvv",
  "pan",
  "cardnumber",
]);

function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const record = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "test") {
      console.info(`[INFO] ${message}`, context ? sanitize(context) : "");
    }
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, context ? sanitize(context) : "");
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, error, context ? sanitize(context) : "");
  },
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, context ? sanitize(context) : "");
    }
  },
};
