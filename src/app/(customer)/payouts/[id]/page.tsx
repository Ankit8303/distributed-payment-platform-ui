"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePayout } from "@/features/payouts/hooks/use-payout";
import { PayoutStatusCard } from "@/features/payouts/components/payout-status-card";
import { PaymentErrorState } from "@/features/payments/components/payment-error-state";

export default function PayoutDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const payoutId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const {
    data: payout,
    isLoading,
    isFetching,
    error,
    refetch,
    isPollingActive,
    isPollingExhausted,
    pollAttemptCount,
    checkStatusManually,
  } = usePayout(payoutId, { enablePolling: true });

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
          Payout Details
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Authoritative disbursement record and external banking network status.
        </p>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="payout-loading-skeleton"
          className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 dark:text-emerald-400" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading authoritative payout details...
          </p>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <PaymentErrorState
            error={error}
            title="Failed to Load Payout"
            onRetry={() => refetch()}
          />
        </div>
      ) : payout ? (
        <PayoutStatusCard
          payout={payout}
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
