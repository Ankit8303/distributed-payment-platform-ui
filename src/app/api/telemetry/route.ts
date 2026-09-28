import { NextResponse } from "next/server";
import { logger } from "@/lib/telemetry/logger";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_TEXT_LENGTH = 500;
const EVENT_TYPES = new Set([
  "client_error",
  "api_error",
  "api_timeout",
  "api_network_error",
]);

function text(value: unknown, maxLength = MAX_TEXT_LENGTH): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function correlationId(value: unknown): string | undefined {
  const candidate = text(value, 100);
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : undefined;
}

function localPath(value: unknown): string | undefined {
  const candidate = text(value, 500);
  if (!candidate) return undefined;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return undefined;
  return candidate.replace(/[?#].*$/, "");
}

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ status: "rejected" }, { status: 413 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ status: "rejected" }, { status: 415 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ status: "rejected" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ status: "rejected" }, { status: 400 });
  }

  const input = payload as Record<string, unknown>;
  const eventType = text(input.type, 40);
  const message = text(input.message);
  if (!eventType || !EVENT_TYPES.has(eventType) || !message) {
    return NextResponse.json({ status: "rejected" }, { status: 400 });
  }

  const event = {
    type: eventType,
    message,
    correlationId: correlationId(input.correlationId),
    errorName: text(input.errorName, 100),
    status:
      typeof input.status === "number" &&
      Number.isInteger(input.status) &&
      input.status >= 100 &&
      input.status <= 599
        ? input.status
        : undefined,
    path: localPath(input.path),
    receivedAt: new Date().toISOString(),
  };

  logger.error("client telemetry", event);

  return NextResponse.json(
    { status: "accepted" },
    {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(): Promise<Response> {
  return NextResponse.json(
    { status: "method_not_allowed" },
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
      },
    }
  );
}
