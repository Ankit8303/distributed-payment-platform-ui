import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/telemetry/logger", () => ({
  logger: { error: vi.fn() },
}));

import { POST } from "@/app/api/telemetry/route";
import { logger } from "@/lib/telemetry/logger";

describe("POST /api/telemetry", () => {
  it("accepts a bounded sanitized telemetry event", async () => {
    const request = new Request("http://localhost/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "api_error",
        message: "request failed",
        correlationId: "12345678-1234-4123-8123-123456789abc",
        path: "/payments/123?token=secret",
        status: 502,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(202);

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      "client telemetry",
      expect.objectContaining({
        type: "api_error",
        message: "request failed",
        correlationId: "12345678-1234-4123-8123-123456789abc",
        path: "/payments/123",
        status: 502,
      })
    );
  });

  it("rejects unsupported event types", async () => {
    const request = new Request("http://localhost/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "admin_action", message: "unexpected" }),
    });

    expect((await POST(request)).status).toBe(400);
  });

  it("rejects non-JSON content", async () => {
    const request = new Request("http://localhost/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "unexpected",
    });

    expect((await POST(request)).status).toBe(415);
  });

  it("rejects oversized payloads", async () => {
    const request = new Request("http://localhost/api/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "9000",
      },
      body: JSON.stringify({ type: "client_error", message: "too large" }),
    });

    expect((await POST(request)).status).toBe(413);
  });
});
