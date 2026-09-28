import { describe, expect, it, vi } from "vitest";
import { buildTelemetryEvent } from "@/lib/telemetry/report";

describe("telemetry report sanitization", () => {
  it("keeps only bounded diagnostic fields", () => {
    const event = buildTelemetryEvent({
      type: "api_error",
      message: "  payment request failed  ",
      correlationId: "12345678-1234-4123-8123-123456789abc",
      errorName: "ApiError",
      status: 502,
      path: "/payments/123?secret=should-not-be-kept",
    });

    expect(event).toEqual({
      type: "api_error",
      message: "payment request failed",
      correlationId: "12345678-1234-4123-8123-123456789abc",
      errorName: "ApiError",
      status: 502,
      path: "/payments/123",
    });
  });

  it("rejects external paths", () => {
    const event = buildTelemetryEvent({
      type: "client_error",
      message: "render failed",
      path: "https://evil.example/collect?token=secret",
    });

    expect(event.path).toBeUndefined();
  });

  it("bounds oversized messages", () => {
    const event = buildTelemetryEvent({
      type: "client_error",
      message: "x".repeat(1000),
    });

    expect(event.message).toHaveLength(500);
  });

  it("does not throw when browser beacon is unavailable", async () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { sendBeacon: vi.fn(() => false) },
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));

    const { reportTelemetry } = await import("@/lib/telemetry/report");
    reportTelemetry({
      type: "client_error",
      message: "safe error",
      path: "/",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/telemetry",
      expect.objectContaining({ method: "POST" })
    );

    fetchSpy.mockRestore();
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: original,
    });
  });
});
