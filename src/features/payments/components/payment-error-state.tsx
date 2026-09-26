import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { ApiError } from "@/lib/api/client";

export interface PaymentErrorStateProps {
  error: ApiError | Error | null | undefined;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function PaymentErrorState({
  error,
  title,
  onRetry,
  className = "",
}: PaymentErrorStateProps) {
  if (!error) return null;

  const isApiError = error instanceof Error && ("response" in error || "errorCode" in error || "status" in error);
  const apiErr = isApiError ? (error as ApiError) : null;

  const displayTitle = title || apiErr?.response?.title || "Payment Processing Error";
  const displayMessage =
    apiErr?.response?.detail ||
    error.message ||
    "An error occurred while processing the payment. Please review and try again.";
  const correlationId = apiErr?.correlationId;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="payment-error-state"
      className={`rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-semibold tracking-tight text-rose-950 dark:text-rose-100">
            {displayTitle}
          </h4>
          <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 leading-relaxed">
            {displayMessage}
          </p>

          {correlationId && (
            <div className="pt-1 text-xs text-rose-700/80 dark:text-rose-400/80 font-mono">
              Correlation ID: {correlationId}
            </div>
          )}

          {onRetry && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
