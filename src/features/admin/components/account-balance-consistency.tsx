"use client";

import React from "react";
import { useAdminAccountBalanceSummary } from "@/features/admin/hooks/use-admin-account-balance-summary";
import { formatMinorUnits } from "@/lib/formatting/money";
import type { ApiError } from "@/lib/api/client";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";

export interface AccountBalanceConsistencyProps {
  accountId: string;
  accountNumber?: string;
  className?: string;
}

/**
 * Phase F7-G-D Admin Account Balance Consistency Component
 * Exposes authoritative backend comparison between:
 * 1. Materialized Account Balance
 * 2. Authoritative Ledger Balance
 * 3. Reported Difference (differenceMinor)
 * 4. Consistency Status (isConsistent)
 *
 * CRITICAL FINANCIAL INVARIANTS:
 * - Presentation-only: Zero client-side arithmetic.
 * - differenceMinor and isConsistent are taken directly from the backend.
 * - Zero mutations, zero balance repairs, zero ledger transactions queries.
 */
export const AccountBalanceConsistency: React.FC<AccountBalanceConsistencyProps> = ({
  accountId,
  accountNumber,
  className = "",
}) => {
  const normalizedId = accountId?.trim() || "";

  const {
    data: balanceSummary,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminAccountBalanceSummary(normalizedId);

  // 1. Loading State
  if (isLoading) {
    return (
      <section
        aria-labelledby="balance-consistency-heading"
        data-testid="balance-consistency-loading"
        className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xs animate-pulse ${className}`}
      >
        <span className="sr-only">Loading balance consistency summary...</span>
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-zinc-800 rounded" />
            <div className="h-5 w-48 bg-zinc-800 rounded" />
          </div>
          <div className="h-6 w-24 bg-zinc-800 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="h-24 bg-zinc-950/60 rounded-lg border border-zinc-800/80" />
          <div className="h-24 bg-zinc-950/60 rounded-lg border border-zinc-800/80" />
          <div className="h-24 bg-zinc-950/60 rounded-lg border border-zinc-800/80" />
        </div>
      </section>
    );
  }

  // 2. Error State
  if (isError || !balanceSummary) {
    const isApiError =
      error instanceof Error &&
      ("response" in error || "errorCode" in error || "status" in error);
    const apiErr = isApiError ? (error as ApiError) : null;
    const errorMessage =
      apiErr?.response?.detail ||
      error?.message ||
      "Unable to retrieve authoritative balance summary from backend ledger.";

    return (
      <section
        aria-labelledby="balance-consistency-heading"
        data-testid="balance-consistency-error"
        className={`rounded-xl border border-rose-900/60 bg-rose-950/30 p-6 space-y-4 shadow-xs ${className}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-rose-900/50">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400" aria-hidden="true" />
            <h2
              id="balance-consistency-heading"
              className="text-base font-semibold tracking-tight text-white"
            >
              Balance Consistency
            </h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-rose-200">
              Failed to Load Balance Consistency
            </div>
            <p className="text-xs text-rose-300 leading-relaxed max-w-xl">
              {errorMessage}
            </p>
            {apiErr?.correlationId && (
              <div className="text-[11px] font-mono text-rose-400 pt-0.5">
                Correlation ID: {apiErr.correlationId}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Retry loading balance consistency"
            data-testid="retry-balance-consistency-button"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-900/80 hover:bg-rose-800 text-white border border-rose-700/80 shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{isFetching ? "Retrying..." : "Retry"}</span>
          </button>
        </div>
      </section>
    );
  }

  // 3. Successful Data Presentation
  const {
    currency,
    materializedBalanceMinor,
    authoritativeLedgerBalanceMinor,
    differenceMinor,
    isConsistent,
  } = balanceSummary;

  const formattedMaterialized = formatMinorUnits(materializedBalanceMinor, currency);
  const formattedLedger = formatMinorUnits(authoritativeLedgerBalanceMinor, currency);
  const formattedDifference = formatMinorUnits(differenceMinor, currency);

  return (
    <section
      aria-labelledby="balance-consistency-heading"
      data-testid="section-balance-consistency"
      className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6 shadow-xs ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <Scale className="w-5 h-5 text-indigo-400" aria-hidden="true" />
          <div>
            <h2
              id="balance-consistency-heading"
              className="text-base font-semibold tracking-tight text-white"
            >
              Balance Consistency
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dual-balance verification: materialized ledger snapshot vs. immutable journal source of truth
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Consistency Badge */}
          {isConsistent ? (
            <span
              data-testid="consistency-status-badge"
              data-status="consistent"
              aria-label="Consistency Status: Verified Consistent"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Consistent</span>
            </span>
          ) : (
            <span
              data-testid="consistency-status-badge"
              data-status="discrepancy"
              aria-label="Consistency Status: Discrepancy Detected"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80 shadow-xs animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
              <span>Discrepancy Detected</span>
            </span>
          )}

          {/* Section Refetch Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh balance consistency"
            data-testid="refresh-balance-consistency-button"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-400" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Discrepancy Alert Banner if isConsistent === false */}
      {!isConsistent && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="balance-discrepancy-alert"
          className="rounded-lg border border-rose-800/80 bg-rose-950/40 p-4 text-rose-200 space-y-2 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-100">
              Authoritative Balance Discrepancy Reported by Backend
            </h3>
          </div>
          <p className="text-xs text-rose-300 leading-relaxed">
            The backend financial audit reports a divergence between the materialized account balance and the immutable double-entry ledger for account{" "}
            <span className="font-mono font-semibold text-white">
              {accountNumber || balanceSummary.accountNumber || accountId}
            </span>
            . Reported difference is{" "}
            <span className="font-mono font-bold text-white">
              {formattedDifference}
            </span>{" "}
            ({differenceMinor.toLocaleString()} minor units).
          </p>
          <div className="text-[11px] text-rose-400 pt-1 border-t border-rose-900/60">
            Read-only governance mode: Client-side balance modification and automated repair are strictly prohibited. Discrepancies must be investigated and resolved via authorized financial operations.
          </div>
        </div>
      )}

      {/* Consistent Verification Note if isConsistent === true */}
      {isConsistent && (
        <div
          data-testid="balance-consistent-note"
          className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 flex items-center gap-2.5 shadow-xs"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>
            Verified Consistent: The materialized balance exactly matches the authoritative immutable ledger journal entries. Reported difference is {formattedDifference}.
          </span>
        </div>
      )}

      {/* 3-Column Financial Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Materialized Balance */}
        <div
          data-testid="card-materialized-balance"
          className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span data-testid="balance-materialized-label">Materialized Balance</span>
            <span className="font-mono text-[11px] text-zinc-500">{currency}</span>
          </div>
          <div
            data-testid="balance-materialized-value"
            className="text-2xl font-bold font-mono text-white tracking-tight"
          >
            {formattedMaterialized}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            {materializedBalanceMinor.toLocaleString()} minor units
          </div>
          <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
            Persistent snapshot balance in PostgreSQL account record.
          </div>
        </div>

        {/* Card 2: Authoritative Ledger Balance */}
        <div
          data-testid="card-authoritative-ledger-balance"
          className="rounded-lg border border-indigo-950/80 bg-zinc-950/60 p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
            <span data-testid="balance-ledger-label">Authoritative Ledger Balance</span>
            <span className="font-mono text-[11px] text-indigo-400">{currency}</span>
          </div>
          <div
            data-testid="balance-ledger-value"
            className="text-2xl font-bold font-mono text-white tracking-tight"
          >
            {formattedLedger}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            {authoritativeLedgerBalanceMinor.toLocaleString()} minor units
          </div>
          <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
            Aggregated sum of immutable double-entry ledger entries.
          </div>
        </div>

        {/* Card 3: Reported Difference */}
        <div
          data-testid="card-reported-difference"
          className={`rounded-lg border p-4 space-y-2 ${
            isConsistent
              ? "border-zinc-800 bg-zinc-950/60"
              : "border-rose-900/80 bg-rose-950/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium">
            <span
              data-testid="balance-difference-label"
              className={isConsistent ? "text-zinc-400" : "text-rose-300"}
            >
              Reported Difference
            </span>
            <span
              className={`font-mono text-[11px] ${
                isConsistent ? "text-zinc-500" : "text-rose-400"
              }`}
            >
              {currency}
            </span>
          </div>
          <div
            data-testid="balance-difference-value"
            className={`text-2xl font-bold font-mono tracking-tight ${
              isConsistent ? "text-white" : "text-rose-200"
            }`}
          >
            {formattedDifference}
          </div>
          <div
            className={`text-[11px] font-mono ${
              isConsistent ? "text-zinc-500" : "text-rose-400"
            }`}
          >
            {differenceMinor.toLocaleString()} minor units
          </div>
          <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
            Backend-calculated audit differential: Materialized vs. Ledger.
          </div>
        </div>
      </div>
    </section>
  );
};
