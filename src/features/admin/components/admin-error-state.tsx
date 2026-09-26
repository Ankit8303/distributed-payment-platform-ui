"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { ApiError } from "@/lib/api/client";

export interface AdminErrorStateProps {
  error: ApiError | Error | null | undefined;
  title?: string;
  onRetry?: () => void;
  className?: string;
  isRetrying?: boolean;
}

export const AdminErrorState: React.FC<AdminErrorStateProps> = ({
  error,
  title,
  onRetry,
  className = "",
  isRetrying = false,
}) => {
  if (!error) return null;

  const isApiError =
    error instanceof Error &&
    ("response" in error || "errorCode" in error || "status" in error);
  const apiErr = isApiError ? (error as ApiError) : null;

  const displayTitle = title || apiErr?.response?.title || "Unable to load dashboard";
  const displayMessage =
    apiErr?.response?.detail ||
    error.message ||
    "The administrative dashboard could not be retrieved. Please verify server connectivity and retry.";
  const correlationId = apiErr?.correlationId;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="admin-error-state"
      className={`rounded-xl border border-rose-900/60 bg-rose-950/40 p-6 text-rose-200 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-lg bg-rose-900/40 border border-rose-800/80 flex items-center justify-center flex-shrink-0 text-rose-400"
          aria-hidden="true"
        >
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="text-base font-semibold tracking-tight text-rose-100">
            {displayTitle}
          </h3>
          <p className="text-sm text-rose-300 leading-relaxed max-w-2xl">
            {displayMessage}
          </p>

          {correlationId && (
            <div
              data-testid="admin-error-correlation-id"
              className="pt-1 text-xs text-rose-400 font-mono"
            >
              Correlation ID: {correlationId}
            </div>
          )}

          {onRetry && (
            <div className="pt-3">
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                data-testid="admin-error-retry-button"
                aria-label="Retry loading dashboard"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-800 hover:bg-rose-700 text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw
                  className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>{isRetrying ? "Retrying..." : "Retry"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
