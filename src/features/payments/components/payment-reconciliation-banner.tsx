import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface PaymentReconciliationBannerProps {
  isPollingActive?: boolean;
  isPollingExhausted?: boolean;
  pollAttemptCount?: number;
  onCheckStatus?: () => void;
  isChecking?: boolean;
  message?: string;
  className?: string;
}

export function PaymentReconciliationBanner({
  isPollingActive = false,
  isPollingExhausted = false,
  pollAttemptCount = 0,
  onCheckStatus,
  isChecking = false,
  message,
  className = "",
}: PaymentReconciliationBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="payment-reconciliation-banner"
      className={`rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold tracking-tight text-amber-950 dark:text-amber-100">
            Payment Reconciliation In Progress
          </h3>
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            {message ||
              "Payment processing. Reconciling with financial network. Please do not submit this payment again."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {isPollingActive && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                <span>Checking payment network status (attempt {pollAttemptCount}/10)...</span>
              </span>
            )}

            {isPollingExhausted && (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Automated status checks paused. Transaction verification is still in progress.
              </span>
            )}

            {onCheckStatus && (
              <button
                type="button"
                onClick={onCheckStatus}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>{isChecking ? "Checking Status..." : "Check Status"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
