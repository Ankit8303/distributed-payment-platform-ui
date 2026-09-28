import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const benchmark = readFileSync("scripts/performance/runtime-benchmark.mjs", "utf8");

describe("Phase 9 performance gate", () => {
  it("runs the production runtime benchmark after the production build", () => {
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("npm run performance:runtime");
  });

  it("uses deterministic concurrency and percentile budgets", () => {
    expect(benchmark).toContain("PERF_CONCURRENCY");
    expect(benchmark).toContain("PERF_MAX_P95_MS");
    expect(benchmark).toContain("PERF_MAX_P99_MS");
    expect(benchmark).toContain("PERF_MAX_ERROR_RATE");
  });

  it("tests both health and readiness endpoints", () => {
    expect(benchmark).toContain('"/api/healthz"');
    expect(benchmark).toContain('"/api/readyz"');
  });

  it("does not target financial mutation endpoints", () => {
    expect(benchmark).not.toContain("/payments");
    expect(benchmark).not.toContain("/payouts");
    expect(benchmark).not.toContain("/refunds");
  });
});
