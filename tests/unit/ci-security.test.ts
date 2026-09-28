import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("CI security gate", () => {
  const workflowPath = path.resolve(process.cwd(), ".github/workflows/ci.yml");
  const workflow = readFileSync(workflowPath, "utf8");

  it("uses Node 24-compatible GitHub Actions", () => {
    expect(workflow).toContain("actions/checkout@v7");
    expect(workflow).toContain("actions/setup-node@v7");
    expect(workflow).toContain("actions/upload-artifact@v6");
  });

  it("runs Gitleaks against the full repository history", () => {
    expect(workflow).toContain("gitleaks/gitleaks-action@v3");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("GITLEAKS_VERSION: 8.30.1");
  });

  it("does not grant the security gate write permissions", () => {
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).toContain('GITLEAKS_ENABLE_COMMENTS: "false"');
    expect(workflow).toContain('GITLEAKS_ENABLE_UPLOAD_ARTIFACT: "false"');
  });
});
