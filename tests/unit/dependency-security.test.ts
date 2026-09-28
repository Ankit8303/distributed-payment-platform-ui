import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("Phase 8 dependency security controls", () => {
  const workflow = readFileSync(
    path.resolve(process.cwd(), ".github/workflows/ci.yml"),
    "utf8"
  );
  const dependabot = readFileSync(
    path.resolve(process.cwd(), ".github/dependabot.yml"),
    "utf8"
  );

  it("blocks high and critical dependency vulnerabilities", () => {
    expect(workflow).toContain("npm audit --audit-level=high");
    expect(workflow).toContain("actions/dependency-review-action@v5");
    expect(workflow).toContain("fail-on-severity: high");
    expect(workflow).toContain("fail-on-scopes: runtime");
  });

  it("keeps dependency automation configured for npm and GitHub Actions", () => {
    expect(dependabot).toContain("package-ecosystem: npm");
    expect(dependabot).toContain("package-ecosystem: github-actions");
    expect(dependabot).toContain("interval: weekly");
  });
});
