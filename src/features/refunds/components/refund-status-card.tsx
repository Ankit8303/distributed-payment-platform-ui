import React, { useState } from "react";
import Link from "next/link";
import { Copy, Check, ArrowLeft } from "lucide-react";
import type { RefundResponse } from "@/types/refund";
import { formatMoney } from "@/features/payments/utils/money-parser";
import { RefundStatusBadge } from "./refund-status-badge";
import { PaymentReconciliationBanner } from "@/features/payments/components/payment-reconciliation-banner";

export interface RefundStatusCardProps {
  refund: RefundResponse;
  isPollingActive?: boolean;
  isPollingExhausted?: boolean;
  pollAttemptCount?: number;
  onCheckStatus?: () => void;
  isChecking?: boolean;
  className?: string;
}

export function RefundStatusCard({
  refund,
  isPollingActive = false,
  isPollingExhausted = false,
  pollAttemptCount = 0,
  onCheckStatus,
  isChecking = false,
  className = "",
}: RefundStatusCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formattedDate = new Date(refund.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return (
    <div
      role="region"
      aria-label="Refund Details"
      data-testid="refund-status-card"
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {/* Header with Refund ID and Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Refund Receipt
          </span>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-base sm:text-lg font-mono font-medium text-slate-900 dark:text-slate-100">
              {refund.refundId}
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(refund.refundId, "refundId")}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              title="Copy Refund ID"
              aria-label="Copy Refund ID"
            >
              {copiedKey === "refundId" ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <RefundStatusBadge status={refund.status} />
        </div>
      </div>

      {/* Primary Amount Card */}
      <div className="my-6 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Refund Amount</span>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
            {formatMoney(refund.amountMinor, refund.currency)}
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Currency: <span className="font-semibold text-slate-700 dark:text-slate-300">{refund.currency}</span>
        </div>
      </div>

      {/* Reconciliation Banner if in PENDING_RECONCILIATION */}
      {refund.status === "PENDING_RECONCILIATION" && (
        <div className="mb-6">
          <PaymentReconciliationBanner
            isPollingActive={isPollingActive}
            isPollingExhausted={isPollingExhausted}
            pollAttemptCount={pollAttemptCount}
            onCheckStatus={onCheckStatus}
            isChecking={isChecking}
            message="Refund processing with payment gateway. Reconciling with financial network. Do not resubmit."
          />
        </div>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Original Payment ID
          </span>
          <Link
            href={`/payments/${refund.paymentId}`}
            className="font-mono text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 break-all select-all hover:underline"
          >
            {refund.paymentId}
          </Link>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Created At
          </span>
          <span className="text-xs text-slate-800 dark:text-slate-200">
            {formattedDate}
          </span>
        </div>

        {refund.compensatingLedgerTransactionId && (
          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Compensating Ledger Transaction ID
            </span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
              {refund.compensatingLedgerTransactionId}
            </span>
          </div>
        )}

        {refund.providerReference && (
          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Provider Reference
            </span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
              {refund.providerReference}
            </span>
          </div>
        )}

        {refund.reason && (
          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30 sm:col-span-2">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Reason
            </span>
            <span className="text-xs text-slate-800 dark:text-slate-200 italic">
              {refund.reason}
            </span>
          </div>
        )}

        {refund.failureReason && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20 sm:col-span-2">
            <span className="block text-xs font-medium text-rose-600 dark:text-rose-400">
              Failure Reason
            </span>
            <span className="text-xs text-rose-800 dark:text-rose-300">
              {refund.failureReason}
            </span>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <Link
          href={`/payments/${refund.paymentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payment</span>
        </Link>
      </div>
    </div>
  );
}
