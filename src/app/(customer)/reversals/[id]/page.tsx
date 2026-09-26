"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useReversal } from "@/features/refunds/hooks/use-reversal";
import { ReversalStatusCard } from "@/features/refunds/components/reversal-status-card";
import { PaymentErrorState } from "@/features/payments/components/payment-error-state";

export default function ReversalDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const reversalId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const {
    data: reversal,
    isLoading,
    isFetching,
    error,
    refetch,
    isPollingActive,
    isPollingExhausted,
    pollAttemptCount,
    checkStatusManually,
  } = useReversal(reversalId, { enablePolling: true });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header section with Single h1 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Reversal Details
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Authoritative full payment reversal record and compensating ledger adjustment.
        </p>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="reversal-loading-skeleton"
          className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-rose-600 dark:text-rose-400" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading authoritative reversal details...
          </p>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <PaymentErrorState
            error={error}
            title="Failed to Load Reversal"
            onRetry={() => refetch()}
          />
        </div>
      ) : reversal ? (
        <ReversalStatusCard
          reversal={reversal}
          isPollingActive={isPollingActive}
          isPollingExhausted={isPollingExhausted}
          pollAttemptCount={pollAttemptCount}
          onCheckStatus={checkStatusManually}
          isChecking={isFetching}
        />
      ) : null}
    </div>
  );
}
