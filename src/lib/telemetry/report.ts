import { logger } from "@/lib/telemetry/logger";

export type TelemetryEventType =
  | "client_error"
  | "api_error"
  | "api_timeout"
  | "api_network_error";

export interface TelemetryEvent {
  type: TelemetryEventType;
  message: string;
  correlationId?: string;
  errorName?: string;
  status?: number;
  path?: string;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_PATH_LENGTH = 500;

function safeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function sanitizePath(value: unknown): string | undefined {
  const path = safeText(value, MAX_PATH_LENGTH);
  if (!path) return undefined;

  try {
    const parsed = new URL(path, window.location.origin);
    return parsed.origin === window.location.origin
      ? parsed.pathname.slice(0, MAX_PATH_LENGTH)
      : undefined;
  } catch {
    return undefined;
  }
}

export function buildTelemetryEvent(
  event: TelemetryEvent
): TelemetryEvent {
  return {
    type: event.type,
    message: safeText(event.message, MAX_MESSAGE_LENGTH) || "Unknown client error",
    ...(safeText(event.correlationId, 100)
      ? { correlationId: safeText(event.correlationId, 100) }
      : {}),
    ...(safeText(event.errorName, 100)
      ? { errorName: safeText(event.errorName, 100) }
      : {}),
    ...(typeof event.status === "number" && Number.isInteger(event.status)
      ? { status: event.status }
      : {}),
    ...(sanitizePath(event.path) ? { path: sanitizePath(event.path) } : {}),
  };
}

export function reportTelemetry(event: TelemetryEvent): void {
  const sanitized = buildTelemetryEvent(event);

  // Local console telemetry remains available even if the reporting endpoint
  // is unavailable. The logger independently redacts sensitive values.
  logger.error("production telemetry event", sanitized);

  if (typeof window === "undefined") return;

  const body = JSON.stringify(sanitized);
  const endpoint = "/api/telemetry";

  try {
    if (typeof navigator.sendBeacon === "function") {
      const accepted = navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: "application/json" })
      );
      if (accepted) return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      // Telemetry must never affect application availability.
    });
  } catch {
    // Telemetry is strictly best-effort.
  }
}
