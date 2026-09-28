import { describe, expect, it } from "vitest";

describe("production smoke verifier contract", () => {
  it("checks the public health endpoints and security headers", async () => {
    const fs = await import("node:fs/promises");
    const source = await fs.readFile("scripts/operations/verify-production.mjs", "utf8");
    expect(source).toContain("/api/healthz");
    expect(source).toContain("/api/readyz");
    expect(source).toContain("strict-transport-security");
    expect(source).toContain("x-content-type-options");
    expect(source).toContain("content-security-policy");
    expect(source).toContain("unsafe-eval");
  });

  it("requires a runtime URL rather than committing production infrastructure details", async () => {
    const fs = await import("node:fs/promises");
    const source = await fs.readFile(".github/workflows/production-ops.yml", "utf8");
    expect(source).toContain("workflow_dispatch:");
    expect(source).toContain("inputs:");
    expect(source).toContain("base_url:");
    expect(source).toContain("PRODUCTION_URL");
  });
});
