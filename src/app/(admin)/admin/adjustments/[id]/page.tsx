"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminAdjustment } from "@/features/admin/hooks/use-admin-adjustment";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import { formatMinorUnits } from "@/lib/formatting/money";
import type { ApiError } from "@/lib/api/client";
import {
  ArrowLeft,
  Scale,
  RefreshCw,
  Copy,
  Check,
  Building2,
  Wallet,
  BookOpen,
  Calendar,
  User,
  ShieldCheck,
  ExternalLink,
  FileQuestion,
  AlertTriangle,
} from "lucide-react";

function AdminAdjustmentDetailContent() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const adjustmentId = typeof rawId === "string" ? rawId.trim() : "";

  const {
    data: adjustment,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminAdjustment(adjustmentId);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div
        data-testid="admin-adjustment-detail-loading"
        role="status"
        aria-live="polite"
        className="space-y-6 animate-pulse"
      >
        <span className="sr-only">Loading adjustment record...</span>
        <div className="h-6 w-32 bg-zinc-800 rounded" />
        <div className="h-28 bg-zinc-900 rounded-xl border border-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
        </div>
        <div className="h-44 bg-zinc-900 rounded-xl border border-zinc-800" />
      </div>
    );
  }

  // 2. 404 / Missing / Not Found State
  const is404 =
    (error && "status" in error && (error as ApiError).status === 404) ||
    (!isLoading && !adjustment && !isError && Boolean(adjustmentId)) ||
    !adjustmentId;

  if (is404) {
    return (
      <div className="space-y-6" data-testid="admin-adjustment-not-found">
        <Link
          href="/admin/adjustments"
          data-testid="back-to-adjustments-link"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Adjustments Workspace</span>
        </Link>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mb-4">
            <FileQuestion className="w-6 h-6 text-amber-400" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">
            Adjustment Not Found
          </h2>
          <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
            The requested financial adjustment identifier (
            <code className="text-xs font-mono text-zinc-300 break-all">
              {adjustmentId || "unknown"}
            </code>
            ) does not correspond to an authoritative record on the platform.
          </p>
          <Link
            href="/admin/adjustments"
            data-testid="not-found-back-button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
          >
            <span>Return to Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Error State (Non-404)
  if (isError || !adjustment) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/adjustments"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Adjustments Workspace</span>
        </Link>

        <AdminErrorState
          error={error}
          title="Failed to Load Financial Adjustment"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  // Format timestamp safely
  const formattedDate = (() => {
    try {
      return new Date(adjustment.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return adjustment.createdAt;
    }
  })();

  return (
    <div className="space-y-6" data-testid="admin-adjustment-detail-page">
      {/* Back Link */}
      <div>
        <Link
          href="/admin/adjustments"
          data-testid="back-to-adjustments-link"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Adjustments Workspace</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <Scale className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                  Financial Adjustment Detail
                </h1>
                <span
                  data-testid="adjustment-status-badge"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-800/80 text-emerald-300"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Adjustment Posted</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                ID: {adjustment.adjustmentId}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-emerald-400" : ""}`}
            aria-hidden="true"
          />
          <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Immutability & Audit Guarantee Notice */}
      <section
        aria-labelledby="immutability-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-300 space-y-1"
      >
        <div className="flex items-center gap-2 font-semibold text-zinc-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <h2 id="immutability-heading" className="text-xs font-semibold text-zinc-200">
            Immutable Double-Entry Ledger Posting
          </h2>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          This record represents an authoritative, permanent administrative ledger adjustment.
          Financial adjustments are immutable and cannot be modified or deleted. Compensating
          ledger legs have been permanently balanced in the platform general ledger.
        </p>
      </section>

      {/* Grid: Identifiers & Financial Amount */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Amount Transferred */}
        <section
          aria-labelledby="amount-heading"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 id="amount-heading" className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-400">
              Amount Transferred
            </h2>
            <span className="text-xs font-mono text-zinc-400 font-bold">
              {adjustment.currency}
            </span>
          </div>

          <div>
            <span
              data-testid="detail-formatted-amount"
              className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 block"
            >
              {formatMinorUnits(adjustment.amountMinor, adjustment.currency)}
            </span>
            <span
              data-testid="detail-minor-units"
              className="text-xs font-mono text-zinc-500 block mt-1"
            >
              {adjustment.amountMinor} integer minor units
            </span>
          </div>
        </section>

        {/* Card 2: Execution Metadata */}
        <section
          aria-labelledby="execution-metadata-heading"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3 md:col-span-2"
        >
          <div className="border-b border-zinc-800 pb-2">
            <h2
              id="execution-metadata-heading"
              className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-400"
            >
              Execution Metadata
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Adjustment ID:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  data-testid="detail-adjustment-id"
                  className="font-mono text-zinc-200 text-xs break-all select-all font-semibold"
                >
                  {adjustment.adjustmentId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(adjustment.adjustmentId, "adjId")}
                  aria-label="Copy adjustment ID"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  {copiedKey === "adjId" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Posting Timestamp:</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-zinc-200">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                <span data-testid="detail-created-at" className="font-mono text-xs">
                  {formattedDate}
                </span>
              </div>
            </div>

            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Executing Operator ID:</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-zinc-200">
                <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                <span
                  data-testid="detail-operator-id"
                  className="font-mono text-xs break-all text-zinc-300"
                >
                  {adjustment.operatorId}
                </span>
              </div>
            </div>

            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Audit Integrity:</span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Authoritative Double-Entry Ledger Synced
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Grid: Account Leg Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Account Leg */}
        <section
          aria-labelledby="source-account-heading"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <h2
                id="source-account-heading"
                className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-300"
              >
                Source Account (Debit Leg)
              </h2>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              DEBIT
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Account Identifier:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  data-testid="detail-source-account-id"
                  className="font-mono text-zinc-200 text-xs break-all select-all font-semibold"
                >
                  {adjustment.sourceAccountId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(adjustment.sourceAccountId, "srcId")}
                  aria-label="Copy source account ID"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  {copiedKey === "srcId" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 pt-1">
              Funds debited synchronously from source account balance in the ledger.
            </p>

            <div className="pt-3">
              <Link
                href={`/admin/accounts/${adjustment.sourceAccountId}`}
                data-testid="source-account-link"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <span>View Source Account Inspector</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Target Account Leg */}
        <section
          aria-labelledby="target-account-heading"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-400" aria-hidden="true" />
              <h2
                id="target-account-heading"
                className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-300"
              >
                Target Account (Credit Leg)
              </h2>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              CREDIT
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Account Identifier:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  data-testid="detail-target-account-id"
                  className="font-mono text-zinc-200 text-xs break-all select-all font-semibold"
                >
                  {adjustment.targetAccountId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(adjustment.targetAccountId, "tgtId")}
                  aria-label="Copy target account ID"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  {copiedKey === "tgtId" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 pt-1">
              Funds credited synchronously to target account balance in the ledger.
            </p>

            <div className="pt-3">
              <Link
                href={`/admin/accounts/${adjustment.targetAccountId}`}
                data-testid="target-account-link"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <span>View Target Account Inspector</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Mandatory Audit Reason */}
      <section
        aria-labelledby="audit-reason-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2"
      >
        <div className="border-b border-zinc-800 pb-2">
          <h2
            id="audit-reason-heading"
            className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-400"
          >
            Authoritative Audit Justification
          </h2>
        </div>
        <div data-testid="detail-reason">
          <p
            data-testid="detail-audit-reason"
            className="text-xs text-zinc-200 italic break-words bg-zinc-950/80 p-3.5 rounded-lg border border-zinc-800/80 leading-relaxed"
          >
            {adjustment.reason}
          </p>
        </div>
      </section>

      {/* Ledger Journal Transaction Trace Section */}
      <section
        aria-labelledby="ledger-trace-heading"
        className="rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-5 space-y-4 text-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-900/60 pb-3">
          <div className="flex items-center gap-2 text-indigo-300">
            <BookOpen className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="ledger-trace-heading" className="text-sm font-semibold text-indigo-200">
              Compensating Ledger Journal Transaction
            </h2>
          </div>
          <span className="text-[11px] font-mono text-indigo-300">
            Authoritative Trace Link
          </span>
        </div>

        <p className="text-[11px] text-zinc-300 leading-relaxed">
          The backend posted a balanced double-entry transaction in the general ledger upon
          successful adjustment execution. Inspect the full balanced transaction entries, sequence
          order, and journal logs in the administrative ledger explorer:
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/80 p-3.5 rounded-lg border border-zinc-800">
          <div>
            <span className="text-zinc-500 font-mono text-[11px] block">
              Compensating Ledger Transaction ID:
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                data-testid="detail-ledger-tx-id"
                className="font-mono text-zinc-100 font-semibold break-all select-all text-xs"
              >
                {adjustment.compensatingLedgerTransactionId}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(adjustment.compensatingLedgerTransactionId, "ledgerTxId")
                }
                aria-label="Copy ledger transaction ID"
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                {copiedKey === "ledgerTxId" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <Link
            href={`/admin/ledger/transactions/${adjustment.compensatingLedgerTransactionId}`}
            data-testid="view-ledger-transaction-link"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 shrink-0"
          >
            <span>View Ledger Transaction</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function AdminAdjustmentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-zinc-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-500" />
          Loading Adjustment Record...
        </div>
      }
    >
      <AdminAdjustmentDetailContent />
    </Suspense>
  );
}
