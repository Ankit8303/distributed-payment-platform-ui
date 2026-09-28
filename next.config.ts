import type { NextConfig } from "next";
import path from "path";
import { validateProductionApiUrl } from "./src/config/env";

export function getConnectSrcOrigins(
  apiUrl?: string,
  nodeEnv: string = process.env.NODE_ENV || "development"
): string[] {
  const isProd = nodeEnv === "production";
  const origins = new Set<string>(["'self'"]);

  if (!isProd) {
    origins.add("http://localhost:8080");
    origins.add("http://127.0.0.1:8080");
  }

  if (apiUrl && typeof apiUrl === "string") {
    try {
      const parsed = new URL(apiUrl.trim());
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        const hostname = parsed.hostname.toLowerCase();
        const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost");
        const isLoopback =
          /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(hostname) ||
          hostname === "0.0.0.0" ||
          hostname === "[::1]" ||
          hostname === "::1" ||
          hostname === "[::]" ||
          hostname === "::";

        if (!isProd || (parsed.protocol === "https:" && !isLocalhost && !isLoopback)) {
          origins.add(parsed.origin);
        }
      }
    } catch {
      // Ignore malformed URL; safe origins preserved
    }
  }
  return Array.from(origins);
}

const isLinting =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg === "lint" || arg.endsWith("/lint") || arg.endsWith("\\lint"));

const isProduction = process.env.NODE_ENV === "production" && !isLinting;
const apiOrigin = process.env.NEXT_PUBLIC_API_URL;

if (isProduction) {
  const validation = validateProductionApiUrl(apiOrigin);
  if (!validation.isValid) {
    throw new Error(
      `[FATAL] Production build configuration error: NEXT_PUBLIC_API_URL is invalid or missing.\n` +
      `Reason: ${validation.error}\n` +
      `Invariant: A production build MUST have a valid HTTPS NEXT_PUBLIC_API_URL pointing to the authoritative backend.`
    );
  }
}

const nodeEnv = process.env.NODE_ENV || "development";
const connectSrc = getConnectSrcOrigins(apiOrigin, nodeEnv).join(" ");

export function getContentSecurityPolicy(
  environment: string = nodeEnv,
  connectSrcOrigins: string = connectSrc
): string {
  const isProd = environment === "production";
  return [
    "default-src 'self'",
    isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    isProd ? "style-src 'self'" : "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src " + connectSrcOrigins,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy", value: getContentSecurityPolicy(nodeEnv, connectSrc) },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
