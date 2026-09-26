import { describe, it, expect } from "vitest";
import { env } from "@/config/env";

describe("Environment Configuration", () => {
  it("provides valid default API URL", () => {
    expect(env.NEXT_PUBLIC_API_URL).toBeDefined();
    expect(env.NEXT_PUBLIC_API_URL).toMatch(/^https?:\/\//);
  });

  it("identifies current test environment", () => {
    expect(["test", "development", "production"]).toContain(env.NODE_ENV);
  });
});
