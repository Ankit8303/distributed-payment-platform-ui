import { describe, it, expect } from "vitest";
import { getSafeRedirectUrl } from "@/lib/auth/safe-redirect";
import nextConfig, { getConnectSrcOrigins, getContentSecurityPolicy } from "../../next.config";

describe("Phase F8-A — Safe Redirect Validation", () => {
  describe("Valid Internal Redirects", () => {
    const validCases = [
      "/",
      "/dashboard",
      "/payments",
      "/payments/123",
      "/admin/dashboard",
      "/accounts/123",
      "/foo?bar=baz",
      "/foo#section",
      "/accounts/acc-001/history?page=2&sort=desc#ledger-entries",
    ];

    validCases.forEach((url) => {
      it(`accepts valid internal path: ${url}`, () => {
        expect(getSafeRedirectUrl(url)).toBe(url);
      });
    });
  });

  describe("Invalid External & Dangerous Redirects", () => {
    const invalidCases: Array<{ name: string; input: string | null | undefined }> = [
      { name: "null", input: null },
      { name: "undefined", input: undefined },
      { name: "empty string", input: "" },
      { name: "whitespace only", input: "   " },
      { name: "absolute HTTPS external", input: "https://evil.com" },
      { name: "absolute HTTP external", input: "http://evil.com" },
      { name: "protocol-relative (two slashes)", input: "//evil.com" },
      { name: "protocol-relative (three slashes)", input: "///evil.com" },
      { name: "javascript: URI scheme", input: "javascript:alert(1)" },
      { name: "data: URI scheme", input: "data:text/html,<script>alert(1)</script>" },
      { name: "vbscript: URI scheme", input: "vbscript:alert(1)" },
      { name: "file: URI scheme", input: "file:///etc/passwd" },
      { name: "backslash without slash", input: "\\evil.com" },
      { name: "double backslash", input: "\\\\evil.com" },
      { name: "slash then backslash", input: "/\\evil.com" },
      { name: "encoded backslash evasion", input: "/%5C%5Cevil.com" },
      { name: "encoded double slash evasion", input: "%2F%2Fevil.com" },
      { name: "double-encoded slash evasion", input: "%252F%252Fevil.com" },
      { name: "embedded CR/LF injection", input: "/dashboard\r\nLocation: https://evil.com" },
      { name: "embedded null byte", input: "/dashboard\0evil" },
      { name: "external URL with userinfo", input: "https://user:pass@evil.com" },
      { name: "tab character evasion", input: "/\tevil.com" },
    ];

    invalidCases.forEach(({ name, input }) => {
      it(`rejects ${name} and defaults to "/"`, () => {
        expect(getSafeRedirectUrl(input)).toBe("/");
      });
    });
  });
});

describe("Phase F8-A — CSP connect-src Dynamic Configuration", () => {
  it("includes default origins ('self', localhost, 127.0.0.1) when no custom URL provided", () => {
    const origins = getConnectSrcOrigins();
    expect(origins).toContain("'self'");
    expect(origins).toContain("http://localhost:8080");
    expect(origins).toContain("http://127.0.0.1:8080");
    expect(origins).not.toContain("*");
  });

  it("adds configured HTTPS staging/production API origin", () => {
    const origins = getConnectSrcOrigins("https://api.staging.example.com");
    expect(origins).toContain("'self'");
    expect(origins).toContain("https://api.staging.example.com");
  });

  it("extracts only the origin and strips subpaths and query strings", () => {
    const origins = getConnectSrcOrigins("https://api.production.example.com/api/v1/payments?debug=true");
    expect(origins).toContain("https://api.production.example.com");
    expect(origins).not.toContain("https://api.production.example.com/api/v1/payments");
  });

  it("handles trailing slashes without syntax duplication", () => {
    const origins = getConnectSrcOrigins("https://api.example.com/");
    expect(origins).toContain("https://api.example.com");
    expect(origins.filter((o) => o === "https://api.example.com").length).toBe(1);
  });

  it("gracefully ignores malformed URLs and preserves safe defaults", () => {
    const origins = getConnectSrcOrigins("not-a-valid-url");
    expect(origins).toContain("'self'");
    expect(origins).toContain("http://localhost:8080");
    expect(origins.length).toBe(3);
  });

  it("does NOT introduce wildcard connect-src", () => {
    const origins = getConnectSrcOrigins("https://api.example.com");
    expect(origins).not.toContain("*");
    const connectSrcString = origins.join(" ");
    expect(connectSrcString).not.toMatch(/(^|\s)\*(\s|$)/);
  });

  it("maintains syntactically valid CSP headers in nextConfig with existing security directives intact", async () => {
    expect(nextConfig.headers).toBeDefined();
    if (nextConfig.headers) {
      const headersConfig = await nextConfig.headers();
      const allPathHeaders = headersConfig.find((h) => h.source === "/:path*");
      expect(allPathHeaders).toBeDefined();

      const headers = allPathHeaders?.headers || [];
      const headerMap = new Map(headers.map((h) => [h.key, h.value]));

      expect(headerMap.get("X-Frame-Options")).toBe("DENY");
      expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
      expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=");
      expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");

      const csp = headerMap.get("Content-Security-Policy");
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).not.toContain("connect-src *");
      expect(csp).toContain("frame-ancestors 'none'");
    }
  });
});


describe("Phase 2 — Production CSP Security Hardening", () => {
  it("removes unsafe-eval from production script policy", () => {
    const csp = getContentSecurityPolicy("production", "'self' https://api.production.example.com");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("does not allow inline styles in production CSP", () => {
    const csp = getContentSecurityPolicy("production", "'self' https://api.production.example.com");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain("style-src 'self' 'unsafe-inline'");
  });

  it("retains only the configured API origin in production connect-src", () => {
    const origins = getConnectSrcOrigins("https://api.production.example.com", "production");
    expect(origins).toEqual(["'self'", "https://api.production.example.com"]);
  });

  it("keeps development CSP compatible with Next.js development tooling", () => {
    const csp = getContentSecurityPolicy("development", "'self' http://localhost:8080");
    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("includes defense-in-depth object-src restriction", () => {
    expect(getContentSecurityPolicy("production", "'self'")).toContain("object-src 'none'");
  });
}