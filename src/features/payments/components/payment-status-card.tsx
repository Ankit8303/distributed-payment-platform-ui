import React, { useState } from "react";
import Link from "next/link";
import { Copy, Check, ArrowLeft, PlusCircle } from "lucide-react";
import type { PaymentResponse } from "@/types/payment";
import { formatMoney } from "../utils/money-parser";
import { PaymentStatusBadge } from "./payment-status-badge";
import { PaymentReconciliationBanner } from "./payment-reconciliation-banner";

export interface PaymentStatusCardProps {
  payment: PaymentResponse;
  isPollingActive?: boolean;
  isPollingExhausted?: boolean;
  pollAttemptCount?: number;
  onCheckStatus?: () => void;
  isChecking?: boolean;
  className?: string;
}

export function PaymentStatusCard({
  payment,
  isPollingActive = false,
  isPollingExhausted = false,
  pollAttemptCount = 0,
  onCheckStatus,
  isChecking = false,
  className = "",
}: PaymentStatusCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formattedDate = new Date(payment.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return (
    <div
      role="region"
      aria-label="Payment Details"
      data-testid="payment-status-card"
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {/* Header with ID and Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Payment Transaction
          </span>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-base sm:text-lg font-mono font-medium text-slate-900 dark:text-slate-100">
              {payment.paymentId}
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(payment.paymentId, "paymentId")}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Copy Payment ID"
              aria-label="Copy Payment ID"
            >
              {copiedKey === "paymentId" ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <PaymentStatusBadge status={payment.status} />
        </div>
      </div>

      {/* Primary Amount Card */}
      <div className="my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Amount</span>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
            {formatMoney(payment.amountMinor, payment.currency)}
          </div>
        </div>
        {payment.feeAmountMinor > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Includes fee: {formatMoney(payment.feeAmountMinor, payment.currency)}
          </div>
        )}
      </div>

      {/* Reconciliation Banner if in PENDING_RECONCILIATION */}
      {payment.status === "PENDING_RECONCILIATION" && (
        <div className="mb-6">
          <PaymentReconciliationBanner
            isPollingActive={isPollingActive}
            isPollingExhausted={isPollingExhausted}
            pollAttemptCount={pollAttemptCount}
            onCheckStatus={onCheckStatus}
            isChecking={isChecking}
            message={payment.message}
          />
        </div>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Payee Account ID
          </span>
          <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
            {payment.payeeAccountId}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Payer Account ID
          </span>
          <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
            {payment.payerAccountId}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Created At
          </span>
          <span className="text-xs text-slate-800 dark:text-slate-200">
            {formattedDate}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Idempotency Key
          </span>
          <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
            {payment.idempotencyKey}
          </span>
        </div>

        {payment.providerReference && (
          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Provider Reference
            </span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
              {payment.providerReference}
            </span>
          </div>
        )}

        {payment.correlationId && (
          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Correlation ID
            </span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
              {payment.correlationId}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        <Link
          href="/payments/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Make Another Payment</span>
        </Link>
      </div>
    </div>
  );
}
