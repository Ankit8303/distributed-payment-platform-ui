import { describe, it, expect } from "vitest";
import {
  validateProductionApiUrl,
  normalizeApiUrl,
  envSchema,
  env,
} from "@/config/env";
import { getConnectSrcOrigins } from "../../next.config";
import { spawnSync } from "child_process";
import path from "path";

describe("Phase 1 — Production Configuration & Environment Hardening", () => {
  describe("validateProductionApiUrl", () => {
    it("accepts valid production HTTPS URL", () => {
      const result = validateProductionApiUrl("https://api.example.com");
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe("https://api.example.com");
      expect(result.error).toBeUndefined();
    });

    it("accepts valid production HTTPS URL with custom port", () => {
      const result = validateProductionApiUrl("https://api.example.com:8443");
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe("https://api.example.com:8443");
    });

    it("accepts valid production HTTPS URL with subpath", () => {
      const result = validateProductionApiUrl("https://api.example.com/payment-api");
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe("https://api.example.com/payment-api");
    });

    it("normalizes and strips trailing slashes on production URL", () => {
      const result = validateProductionApiUrl("https://api.example.com/payment-api///");
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe("https://api.example.com/payment-api");
    });

    it("rejects missing production URL (undefined)", () => {
      const result = validateProductionApiUrl(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/required in production/i);
    });

    it("rejects missing production URL (null)", () => {
      const result = validateProductionApiUrl(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/required in production/i);
    });

    it("rejects empty production URL string", () => {
      const result = validateProductionApiUrl("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/required in production/i);
    });

    it("rejects non-string input", () => {
      const result = validateProductionApiUrl(12345);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/must be a string/i);
    });

    it("rejects HTTP production URL (non-HTTPS)", () => {
      const result = validateProductionApiUrl("http://api.example.com");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/HTTPS protocol/i);
    });

    it("rejects localhost production URL (http://localhost:8080)", () => {
      const result = validateProductionApiUrl("http://localhost:8080");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/HTTPS protocol|localhost/i);
    });

    it("rejects localhost production URL even with HTTPS (https://localhost:8443)", () => {
      const result = validateProductionApiUrl("https://localhost:8443");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/localhost/i);
    });

    it("rejects localhost subdomain (https://api.localhost)", () => {
      const result = validateProductionApiUrl("https://api.localhost");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/localhost/i);
    });

    it("rejects loopback production URL (http://127.0.0.1:8080)", () => {
      const result = validateProductionApiUrl("http://127.0.0.1:8080");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/HTTPS protocol|loopback/i);
    });

    it("rejects loopback production URL even with HTTPS (https://127.0.0.1:8443)", () => {
      const result = validateProductionApiUrl("https://127.0.0.1:8443");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/loopback/i);
    });

    it("rejects entire 127.0.0.0/8 loopback range (https://127.0.0.2)", () => {
      const result = validateProductionApiUrl("https://127.0.0.2");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/loopback/i);
    });

    it("rejects IPv6 loopback (https://[::1])", () => {
      const result = validateProductionApiUrl("https://[::1]");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/loopback/i);
    });

    it("rejects unspecified address (http://0.0.0.0:8080)", () => {
      const result = validateProductionApiUrl("http://0.0.0.0:8080");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/HTTPS protocol|unspecified/i);
    });

    it("rejects unspecified address with HTTPS (https://0.0.0.0)", () => {
      const result = validateProductionApiUrl("https://0.0.0.0");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/unspecified/i);
    });

    it("rejects IPv6 unspecified address (https://[::])", () => {
      const result = validateProductionApiUrl("https://[::]");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/unspecified/i);
    });

    it("rejects malformed URL", () => {
      const result = validateProductionApiUrl("not-a-valid-url");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/valid absolute URL/i);
    });

    it("rejects embedded user credentials in URL (https://user:password@example.com)", () => {
      const result = validateProductionApiUrl("https://user:password@example.com");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/credentials/i);
    });

    it("rejects user-only credentials in URL (https://user@example.com)", () => {
      const result = validateProductionApiUrl("https://user@example.com");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/credentials/i);
    });

    it("rejects URL fragments (#section)", () => {
      const result = validateProductionApiUrl("https://api.example.com#section");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/fragment/i);
    });
  });

  describe("normalizeApiUrl", () => {
    it("trims whitespace and removes trailing slashes", () => {
      expect(normalizeApiUrl("  https://api.example.com/  ")).toBe("https://api.example.com");
      expect(normalizeApiUrl("https://api.example.com///")).toBe("https://api.example.com");
    });

    it("preserves subpaths without trailing slash", () => {
      expect(normalizeApiUrl("https://api.example.com/api/v1/")).toBe("https://api.example.com/api/v1");
      expect(normalizeApiUrl("https://api.example.com/api/v1")).toBe("https://api.example.com/api/v1");
    });

    it("joins with endpoint without generating double slashes or missing slashes", () => {
      const normalizedBase = normalizeApiUrl("https://api.example.com/api/");
      const endpointWithSlash = "/v1/payments";
      const endpointWithoutSlash = "v1/payments";

      const joined1 = `${normalizedBase}${endpointWithSlash.startsWith("/") ? "" : "/"}${endpointWithSlash}`;
      const joined2 = `${normalizedBase}${endpointWithoutSlash.startsWith("/") ? "" : "/"}${endpointWithoutSlash}`;

      expect(joined1).toBe("https://api.example.com/api/v1/payments");
      expect(joined2).toBe("https://api.example.com/api/v1/payments");
      expect(joined1).not.toContain("api//v1");
    });
  });

  describe("envSchema Environment Invariants", () => {
    describe("Production (NODE_ENV=production)", () => {
      it("fails when NEXT_PUBLIC_API_URL is missing", () => {
        expect(() => {
          envSchema.parse({ NODE_ENV: "production" });
        }).toThrow(/required in production/i);
      });

      it("fails when NEXT_PUBLIC_API_URL is http://localhost:8080", () => {
        expect(() => {
          envSchema.parse({
            NODE_ENV: "production",
            NEXT_PUBLIC_API_URL: "http://localhost:8080",
          });
        }).toThrow(/HTTPS protocol|localhost/i);
      });

      it("fails when NEXT_PUBLIC_API_URL is http://127.0.0.1:8080", () => {
        expect(() => {
          envSchema.parse({
            NODE_ENV: "production",
            NEXT_PUBLIC_API_URL: "http://127.0.0.1:8080",
          });
        }).toThrow(/HTTPS protocol|loopback/i);
      });

      it("fails when NEXT_PUBLIC_API_URL is http://0.0.0.0:8080", () => {
        expect(() => {
          envSchema.parse({
            NODE_ENV: "production",
            NEXT_PUBLIC_API_URL: "http://0.0.0.0:8080",
          });
        }).toThrow(/HTTPS protocol|unspecified/i);
      });

      it("fails when NEXT_PUBLIC_API_URL has embedded credentials", () => {
        expect(() => {
          envSchema.parse({
            NODE_ENV: "production",
            NEXT_PUBLIC_API_URL: "https://admin:secret@api.production.com",
          });
        }).toThrow(/credentials/i);
      });

      it("succeeds with valid HTTPS production URL", () => {
        const parsed = envSchema.parse({
          NODE_ENV: "production",
          NEXT_PUBLIC_API_URL: "https://api.production.example.com/",
        });
        expect(parsed.NEXT_PUBLIC_API_URL).toBe("https://api.production.example.com");
        expect(parsed.NODE_ENV).toBe("production");
      });
    });

    describe("Development (NODE_ENV=development)", () => {
      it("falls back to isolated http://localhost:8080 when NEXT_PUBLIC_API_URL is omitted", () => {
        const parsed = envSchema.parse({ NODE_ENV: "development" });
        expect(parsed.NEXT_PUBLIC_API_URL).toBe("http://localhost:8080");
        expect(parsed.NODE_ENV).toBe("development");
      });

      it("accepts explicit custom NEXT_PUBLIC_API_URL in development", () => {
        const parsed = envSchema.parse({
          NODE_ENV: "development",
          NEXT_PUBLIC_API_URL: "http://localhost:9090",
        });
        expect(parsed.NEXT_PUBLIC_API_URL).toBe("http://localhost:9090");
      });
    });

    describe("Test (NODE_ENV=test)", () => {
      it("provides deterministic test URL when NEXT_PUBLIC_API_URL is omitted", () => {
        const parsed = envSchema.parse({ NODE_ENV: "test" });
        expect(parsed.NEXT_PUBLIC_API_URL).toBe("https://api.test.local");
        expect(parsed.NODE_ENV).toBe("test");
      });

      it("identifies active test environment object", () => {
        expect(env.NODE_ENV).toBe("test");
        expect(env.NEXT_PUBLIC_API_URL).toBeDefined();
        expect(env.NEXT_PUBLIC_API_URL).toMatch(/^https?:\/\//);
      });
    });
  });

  describe("CSP connect-src Production Security (next.config.ts)", () => {
    it("in production, connect-src contains ONLY 'self' and HTTPS API origin", () => {
      const origins = getConnectSrcOrigins("https://api.production.example.com", "production");
      expect(origins).toContain("'self'");
      expect(origins).toContain("https://api.production.example.com");
      expect(origins).not.toContain("http://localhost:8080");
      expect(origins).not.toContain("http://127.0.0.1:8080");
      expect(origins).not.toContain("*");
    });

    it("in production, rejects adding localhost to connect-src", () => {
      const origins = getConnectSrcOrigins("http://localhost:8080", "production");
      expect(origins).toEqual(["'self'"]);
      expect(origins).not.toContain("http://localhost:8080");
    });

    it("in development/test, includes local development origins", () => {
      const origins = getConnectSrcOrigins(undefined, "development");
      expect(origins).toContain("'self'");
      expect(origins).toContain("http://localhost:8080");
      expect(origins).toContain("http://127.0.0.1:8080");
    });
  });

  describe("Build Regression — Production Build Fail-Closed Verification", () => {
    it(
      "proves that production build fails-closed when NEXT_PUBLIC_API_URL is missing",
      () => {
        const projectRoot = path.resolve(__dirname, "../../");
        const nextBin = path.resolve(projectRoot, "node_modules/next/dist/bin/next");

        const proc = spawnSync(process.execPath, [nextBin, "build"], {
          cwd: projectRoot,
          env: {
            ...process.env,
            NODE_ENV: "production",
            NEXT_PUBLIC_API_URL: "",
          },
          encoding: "utf-8",
        });

        expect(proc.status).toBe(1);
        expect(proc.stderr + proc.stdout).toMatch(/NEXT_PUBLIC_API_URL is required in production/i);
      },
      30000
    );

    it(
      "proves that production build fails-closed when NEXT_PUBLIC_API_URL targets localhost",
      () => {
        const projectRoot = path.resolve(__dirname, "../../");
        const nextBin = path.resolve(projectRoot, "node_modules/next/dist/bin/next");

        const proc = spawnSync(process.execPath, [nextBin, "build"], {
          cwd: projectRoot,
          env: {
            ...process.env,
            NODE_ENV: "production",
            NEXT_PUBLIC_API_URL: "http://localhost:8080",
          },
          encoding: "utf-8",
        });

        expect(proc.status).toBe(1);
        expect(proc.stderr + proc.stdout).toMatch(/HTTPS protocol/i);
      },
      30000
    );
  });
});
