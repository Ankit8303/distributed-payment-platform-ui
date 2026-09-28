import { z } from "zod";

/**
 * Normalizes an API URL by trimming whitespace and removing trailing slashes.
 * Ensures consistent joining with relative endpoint paths without double slashes.
 */
export function normalizeApiUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  return trimmed.replace(/\/+$/, "");
}

export interface ProductionValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Validates that an API URL satisfies strict production environment invariants:
 * - Must be present and non-empty
 * - Must be a syntactically valid absolute URL
 * - Must use HTTPS protocol (non-secure HTTP is strictly prohibited)
 * - Must have a valid non-empty hostname
 * - Must NOT target localhost or any *.localhost subdomain
 * - Must NOT target loopback addresses (127.0.0.0/8, ::1)
 * - Must NOT target unspecified addresses (0.0.0.0, ::)
 * - Must NOT contain embedded user credentials
 * - Must NOT contain URL fragments (#)
 */
export function validateProductionApiUrl(value: unknown): ProductionValidationResult {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return {
      isValid: false,
      error: "NEXT_PUBLIC_API_URL is required in production environments but was missing or empty.",
    };
  }

  if (typeof value !== "string") {
    return {
      isValid: false,
      error: `NEXT_PUBLIC_API_URL must be a string, received ${typeof value}.`,
    };
  }

  const trimmed = value.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      error: `NEXT_PUBLIC_API_URL must be a valid absolute URL (failed to parse "${trimmed}").`,
    };
  }

  // Enforce HTTPS
  if (parsed.protocol !== "https:") {
    return {
      isValid: false,
      error: `NEXT_PUBLIC_API_URL must use the HTTPS protocol in production. Received: "${parsed.protocol}" in "${trimmed}". Non-secure HTTP is strictly prohibited in production.`,
    };
  }

  // Reject embedded credentials
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      error: "NEXT_PUBLIC_API_URL must not contain embedded user credentials.",
    };
  }

  // Reject fragments
  if (parsed.hash) {
    return {
      isValid: false,
      error: "NEXT_PUBLIC_API_URL must not contain URL fragments (#).",
    };
  }

  const rawHostname = parsed.hostname.toLowerCase();
  if (!rawHostname) {
    return {
      isValid: false,
      error: "NEXT_PUBLIC_API_URL must specify a valid non-empty hostname.",
    };
  }

  // Normalize IPv6 brackets if present
  const cleanHost = rawHostname.replace(/^\[|\]$/g, "");

  // Reject localhost and localhost subdomains
  if (rawHostname === "localhost" || rawHostname.endsWith(".localhost")) {
    return {
      isValid: false,
      error: `NEXT_PUBLIC_API_URL must not target localhost in production ("${rawHostname}"). A production build cannot target a local development machine.`,
    };
  }

  // Reject IPv4 loopback (127.0.0.0/8)
  const ipv4LoopbackRegex = /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/;
  if (ipv4LoopbackRegex.test(cleanHost)) {
    return {
      isValid: false,
      error: `NEXT_PUBLIC_API_URL must not target a loopback address in production ("${cleanHost}").`,
    };
  }

  // Reject unspecified 0.0.0.0
  if (cleanHost === "0.0.0.0") {
    return {
      isValid: false,
      error: "NEXT_PUBLIC_API_URL must not target the unspecified address (0.0.0.0) in production.",
    };
  }

  // Reject IPv6 loopback (::1) and unspecified (::)
  if (cleanHost === "::1" || cleanHost === "0:0:0:0:0:0:0:1") {
    return {
      isValid: false,
      error: "NEXT_PUBLIC_API_URL must not target IPv6 loopback [::1] in production.",
    };
  }
  if (cleanHost === "::" || cleanHost === "0:0:0:0:0:0:0:0") {
    return {
      isValid: false,
      error: "NEXT_PUBLIC_API_URL must not target IPv6 unspecified [::] in production.",
    };
  }

  return {
    isValid: true,
    normalizedUrl: normalizeApiUrl(trimmed),
  };
}

/**
 * Environment-aware schema:
 * - Production: Strictly requires an HTTPS, non-localhost, non-loopback NEXT_PUBLIC_API_URL.
 * - Development: Allows local fallback to http://localhost:8080 ONLY when NODE_ENV === 'development'.
 * - Test: Provides deterministic test fallback (https://api.test.local).
 */
const isLinting =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg === "lint" || arg.endsWith("/lint") || arg.endsWith("\\lint"));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_API_URL: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const { NODE_ENV, NEXT_PUBLIC_API_URL } = data;

    // Strict validation applies in production builds (excluding static lint analysis)
    if (NODE_ENV === "production" && !isLinting) {
      const result = validateProductionApiUrl(NEXT_PUBLIC_API_URL);
      if (!result.isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["NEXT_PUBLIC_API_URL"],
          message: result.error || "Invalid production NEXT_PUBLIC_API_URL",
        });
      }
    } else if (NODE_ENV === "development") {
      if (NEXT_PUBLIC_API_URL && NEXT_PUBLIC_API_URL.trim() !== "") {
        try {
          const parsed = new URL(NEXT_PUBLIC_API_URL.trim());
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["NEXT_PUBLIC_API_URL"],
              message: "Development NEXT_PUBLIC_API_URL must use http: or https: protocol.",
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["NEXT_PUBLIC_API_URL"],
            message: "Development NEXT_PUBLIC_API_URL must be a valid URL.",
          });
        }
      }
    } else if (NODE_ENV === "test") {
      if (NEXT_PUBLIC_API_URL && NEXT_PUBLIC_API_URL.trim() !== "") {
        try {
          new URL(NEXT_PUBLIC_API_URL.trim());
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["NEXT_PUBLIC_API_URL"],
            message: "Test NEXT_PUBLIC_API_URL must be a valid URL.",
          });
        }
      }
    }
  })
  .transform((data) => {
    const { NODE_ENV, NEXT_PUBLIC_API_URL } = data;
    if (NODE_ENV === "production" && !isLinting) {
      const result = validateProductionApiUrl(NEXT_PUBLIC_API_URL);
      return {
        NODE_ENV,
        NEXT_PUBLIC_API_URL: result.normalizedUrl!,
      };
    }

    if (NODE_ENV === "production" && isLinting) {
      return {
        NODE_ENV,
        NEXT_PUBLIC_API_URL: NEXT_PUBLIC_API_URL ? normalizeApiUrl(NEXT_PUBLIC_API_URL) : "https://api.lint.local",
      };
    }

    if (NODE_ENV === "development") {
      if (NEXT_PUBLIC_API_URL && NEXT_PUBLIC_API_URL.trim() !== "") {
        return {
          NODE_ENV,
          NEXT_PUBLIC_API_URL: normalizeApiUrl(NEXT_PUBLIC_API_URL.trim()),
        };
      }
      return {
        NODE_ENV,
        NEXT_PUBLIC_API_URL: "http://localhost:8080",
      };
    }

    // test environment
    if (NEXT_PUBLIC_API_URL && NEXT_PUBLIC_API_URL.trim() !== "") {
      return {
        NODE_ENV,
        NEXT_PUBLIC_API_URL: normalizeApiUrl(NEXT_PUBLIC_API_URL.trim()),
      };
    }
    return {
      NODE_ENV,
      NEXT_PUBLIC_API_URL: "https://api.test.local",
    };
  });

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

export type Env = z.infer<typeof envSchema>;
