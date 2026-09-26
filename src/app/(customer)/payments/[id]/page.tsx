"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { usePayment } from "@/features/payments/hooks/use-payment";
import { PaymentStatusCard } from "@/features/payments/components/payment-status-card";
import { PaymentErrorState } from "@/features/payments/components/payment-error-state";
import { RefundModal } from "@/features/refunds/components/refund-modal";
import { ReversalModal } from "@/features/refunds/components/reversal-modal";

export default function PaymentDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const paymentId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);

  const {
    data: payment,
    isLoading,
    isFetching,
    error,
    refetch,
    isPollingActive,
    isPollingExhausted,
    pollAttemptCount,
    checkStatusManually,
  } = usePayment(paymentId, { enablePolling: true });

  const isSettled = payment?.status === "SETTLED";

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Payment Details
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Authoritative transaction state from the ledger platform.
            </p>
          </div>

          {/* Conditional Action Triggers for Settled Payments */}
          {isSettled && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                data-testid="open-refund-modal-button"
                onClick={() => setIsRefundModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Issue Refund</span>
              </button>
              <button
                type="button"
                data-testid="open-reversal-modal-button"
                onClick={() => setIsReversalModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Request Reversal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="payment-loading-skeleton"
          className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600 dark:text-indigo-400" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading authoritative payment details...
          </p>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <PaymentErrorState
            error={error}
            title="Failed to Load Payment"
            onRetry={() => refetch()}
          />
        </div>
      ) : payment ? (
        <>
          <PaymentStatusCard
            payment={payment}
            isPollingActive={isPollingActive}
            isPollingExhausted={isPollingExhausted}
            pollAttemptCount={pollAttemptCount}
            onCheckStatus={checkStatusManually}
            isChecking={isFetching}
          />

          {/* Refund Modal */}
          <RefundModal
            isOpen={isRefundModalOpen}
            paymentId={payment.paymentId}
            paymentCurrency={payment.currency}
            originalAmountMinor={payment.amountMinor}
            onClose={() => setIsRefundModalOpen(false)}
          />

          {/* Reversal Modal */}
          <ReversalModal
            isOpen={isReversalModalOpen}
            paymentId={payment.paymentId}
            paymentCurrency={payment.currency}
            originalAmountMinor={payment.amountMinor}
            onClose={() => setIsReversalModalOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
