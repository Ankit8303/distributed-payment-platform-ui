"use client";

import React from "react";
import { AlertCircle, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import type { ApiErrorResponse } from "@/types/api";

export type BoundaryError = Error & {
  digest?: string;
  correlationId?: string;
  status?: number;
  response?: ApiErrorResponse | Record<string, unknown>;
  title?: string;
  detail?: string;
};

export interface ErrorBoundaryViewProps {
  error: BoundaryError;
  reset: () => void;
  title?: string;
  fallbackTitle?: string;
  scope?: "root" | "admin" | "segment";
  dashboardHref?: string;
  className?: string;
}

/**
 * Validates whether an error message or detail string is safe for user-facing display.
 * Rejects stack traces, internal paths, raw SQL, passwords, and authorization tokens.
 */
export function isSafeString(val: unknown): boolean {
  if (typeof val !== "string" || !val.trim()) return false;

  const forbiddenPatterns = [
    /\bat\s+.*\(/i, // Stack traces like "at Component ("
    /\bnode_modules\b/i, // File system paths
    /[a-zA-Z]:\\[a-zA-Z0-9_]/, // Windows paths e.g. C:\
    /\/(var|usr|etc|tmp|home)\//i, // Unix paths
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)\s+[a-zA-Z0-9_*]/i, // SQL
    /\bBearer\s+[a-zA-Z0-9._-]+/i, // Authorization tokens
    /\bpassword\b/i,
    /\bapiKey\b/i,
    /\bsecret\b/i,
  ];

  return !forbiddenPatterns.some((pattern) => pattern.test(val));
}

/**
 * Extracts and sanitizes RFC 7807 problem detail fields and diagnostic correlation ID.
 * Strictly avoids fabricating replacement or fake IDs when correlation ID is absent.
 */
export function extractSafeDetails(
  error: BoundaryError,
  fallbackTitle: string
) {
  const isApi = Boolean(
    error &&
      ("response" in error || "errorCode" in error || "status" in error)
  );
  const apiResponse =
    isApi && error.response && typeof error.response === "object"
      ? (error.response as Record<string, unknown>)
      : null;

  // RFC 7807 Title
  const errorDuck = error as { title?: unknown; detail?: unknown };
  const rawTitle =
    (apiResponse && typeof apiResponse.title === "string" ? apiResponse.title : null) ||
    (typeof errorDuck.title === "string" ? errorDuck.title : null);
  const title = rawTitle && isSafeString(rawTitle) ? rawTitle : fallbackTitle;

  // RFC 7807 Status Code
  const status =
    typeof error.status === "number"
      ? error.status
      : typeof apiResponse?.status === "number"
        ? apiResponse.status
        : undefined;

  // RFC 7807 Detail (Safe sanitized detail only)
  const rawDetail =
    (apiResponse && typeof apiResponse.detail === "string" ? apiResponse.detail : null) ||
    (typeof errorDuck.detail === "string" ? errorDuck.detail : null);
  let detail = "We couldn't complete this request. Please try again.";
  if (rawDetail && isSafeString(rawDetail)) {
    detail = rawDetail;
  }

  // Diagnostic Correlation ID: Strictly extracted from API error response or error object.
  // Never fabricated, synthesized, or replaced with fake values.
  let correlationId: string | undefined = undefined;
  if (typeof error.correlationId === "string" && error.correlationId.trim()) {
    correlationId = error.correlationId.trim();
  } else if (
    apiResponse &&
    typeof apiResponse.correlationId === "string" &&
    apiResponse.correlationId.trim()
  ) {
    correlationId = apiResponse.correlationId.trim();
  }

  return { title, detail, status, correlationId };
}

/**
 * Reusable Standardized Safe Error Presentation Component.
 *
 * Implements:
 * - Semantic heading
 * - Logical DOM structure
 * - Keyboard-accessible controls
 * - Visible focus rings
 * - Safe RFC 7807 problem detail presentation
 * - Real correlation ID presentation (no fabricated IDs)
 * - Safe "Try Again" recovery action calling `reset()`
 * - Zero automatic financial mutation replay
 */
export function ErrorBoundaryView({
  error,
  reset,
  title: customTitle,
  fallbackTitle: customFallbackTitle,
  scope = "segment",
  dashboardHref = "/dashboard",
  className = "",
}: ErrorBoundaryViewProps) {
  const defaultFallbackTitle =
    scope === "admin"
      ? "Administrative Operation Failed"
      : "Something went wrong";

  const { title, detail, status, correlationId } = extractSafeDetails(
    error,
    customFallbackTitle || customTitle || defaultFallbackTitle
  );

  const HeadingTag = scope === "root" ? "h1" : "h2";

  return (
    <section
      role="alert"
      aria-live="assertive"
      data-testid="error-boundary-container"
      className={`max-w-2xl w-full mx-auto rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 sm:p-8 text-rose-200 shadow-xl backdrop-blur-sm ${className}`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl bg-rose-900/40 border border-rose-800/80 flex items-center justify-center flex-shrink-0 text-rose-400"
          aria-hidden="true"
        >
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <HeadingTag
              data-testid="error-heading"
              className="text-lg sm:text-xl font-bold tracking-tight text-rose-100"
            >
              {title}
            </HeadingTag>
            {status && (
              <span
                data-testid="error-status-badge"
                className="text-xs px-2 py-0.5 rounded bg-rose-900/60 border border-rose-800 text-rose-300 font-mono"
              >
                HTTP {status}
              </span>
            )}
          </div>

          <p
            data-testid="error-message"
            className="text-sm text-rose-300 leading-relaxed"
          >
            {detail}
          </p>

          {correlationId && (
            <div
              data-testid="error-reference-id"
              className="pt-1 text-xs text-rose-400 font-mono"
            >
              Reference ID: {correlationId}
            </div>
          )}

          <div className="pt-4 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={reset}
              data-testid="error-reset-button"
              aria-label="Try again to reload request"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-800 hover:bg-rose-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Try Again</span>
            </button>

            {dashboardHref && (
              <Link
                href={dashboardHref}
                data-testid="error-dashboard-link"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                <LayoutDashboard className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                <span>
                  {scope === "admin" ? "Admin Dashboard" : "Return to Dashboard"}
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
