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
  "apikey",
  "clientsecret",
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[._-]/g, "");
}

function sanitizeString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/((?:password|token|secret|authorization|api[_-]?key)\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]");
}

function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") return sanitizeString(data);
  if (typeof data !== "object") return data;

  if (data instanceof Error) {
    return {
      name: data.name,
      message: sanitizeString(data.message),
      ...(data.cause !== undefined ? { cause: sanitize(data.cause) } : {}),
    };
  }

  if (Array.isArray(data)) return data.map(sanitize);

  const record = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (REDACTED_KEYS.has(normalizeKey(key))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitize(value);
    }
  }

  return sanitized;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "test") {
      console.info(`[INFO] ${sanitizeString(message)}`, context ? sanitize(context) : "");
    }
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${sanitizeString(message)}`, context ? sanitize(context) : "");
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(
      `[ERROR] ${sanitizeString(message)}`,
      error !== undefined ? sanitize(error) : "",
      context ? sanitize(context) : ""
    );
  },
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${sanitizeString(message)}`, context ? sanitize(context) : "");
    }
  },
};
