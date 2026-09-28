import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/telemetry/logger";

describe("client telemetry logger", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    consoleError.mockClear();
    consoleWarn.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("never logs a raw Error object", () => {
    const error = new Error("Bearer super-secret-token");
    error.name = "ApiError";
    logger.error("API request failed", error);

    expect(consoleError).toHaveBeenCalledTimes(1);
    const [, loggedError] = consoleError.mock.calls[0] ?? [];
    expect(loggedError).toEqual({
      name: "ApiError",
      message: "Bearer [REDACTED]",
    });
  });

  it("redacts sensitive keys recursively, including common key separators", () => {
    logger.warn("sensitive context", {
      access_token: "access-secret",
      refreshToken: "refresh-secret",
      "api-key": "api-secret",
      nested: {
        authorization: "Bearer secret",
        pan: "4111111111111111",
      },
    });

    const [, context] = consoleWarn.mock.calls[0] ?? [];
    expect(context).toEqual({
      access_token: "[REDACTED]",
      refreshToken: "[REDACTED]",
      "api-key": "[REDACTED]",
      nested: {
        authorization: "[REDACTED]",
        pan: "[REDACTED]",
      },
    });
  });

  it("sanitizes sensitive values embedded in messages", () => {
    logger.error("request failed: token=super-secret Bearer abc.def.ghi");
    const [message] = consoleError.mock.calls[0] ?? [];
    expect(message).toBe("[ERROR] request failed: token=[REDACTED] Bearer [REDACTED]");
  });
});
