"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminLedgerTransaction } from "@/features/admin/hooks/use-admin-ledger-transaction";
import { LedgerDirectionBadge } from "@/features/admin/components/investigation-status-badges";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import { formatMoney } from "@/features/payments/utils/money-parser";
import {
  ArrowLeft,
  RefreshCw,
  BookOpen,
  Calendar,
  Layers,
  Copy,
  Check,
  ExternalLink,
  Wallet,
} from "lucide-react";

export default function AdminLedgerTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const transactionId = params?.id || "";

  const {
    data: tx,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminLedgerTransaction(transactionId);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div
        data-testid="admin-ledger-tx-detail-loading"
        className="space-y-6 animate-pulse"
      >
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800" />
        <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
      </div>
    );
  }

  if (isError || !tx) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/ledger/transactions"
          data-testid="back-to-ledger-link"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline min-h-[38px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Ledger Transactions</span>
        </Link>

        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const formattedCreatedAt = new Date(tx.createdAt).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
  });
  const isPayment = tx.sourceReferenceType === "PAYMENT";
  const entryCount = tx.entries?.length || 0;

  return (
    <div
      data-testid="admin-ledger-tx-detail-container"
      className="space-y-8 max-w-6xl mx-auto pb-12"
    >
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/admin/ledger/transactions"
          data-testid="back-to-ledger-link"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline min-h-[38px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Ledger Transactions</span>
        </Link>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="admin-ledger-tx-refresh-button"
          aria-label="Refresh transaction details"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400 shadow-sm"
            aria-hidden="true"
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ledger Transaction
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Authoritative double-entry immutable transaction journal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300">
          <span className="text-zinc-500">Tx ID:</span>
          <span>{tx.id}</span>
          <button
            type="button"
            onClick={() => handleCopy(tx.id, "txId")}
            aria-label="Copy Transaction ID"
            className="text-zinc-400 hover:text-white transition-colors ml-1 focus:outline-none"
          >
            {copiedKey === "txId" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Section 1: Transaction Metadata */}
      <section
        data-testid="ledger-tx-summary-section"
        aria-labelledby="tx-summary-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Layers className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <h2 id="tx-summary-heading" className="text-base font-semibold text-zinc-100">
            Transaction Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Source Reference */}
          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Source Reference</div>
            <div className="text-sm font-mono font-semibold text-zinc-200 truncate" title={tx.sourceReferenceId}>
              {tx.sourceReferenceId}
            </div>
            {isPayment ? (
              <Link
                href={`/admin/payments/${tx.sourceReferenceId}`}
                data-testid="source-payment-link"
                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none focus-visible:underline"
              >
                <span>Inspect Payment</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </Link>
            ) : (
              <div className="text-[11px] text-zinc-500">Operation Identifier</div>
            )}
          </div>

          {/* Source Reference Type */}
          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Source Type</div>
            <div className="text-base font-bold font-mono text-zinc-100" data-testid="source-reference-type">
              {tx.sourceReferenceType}
            </div>
            <div className="text-[11px] text-zinc-500">Accounting Event Classification</div>
          </div>

          {/* Description */}
          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Description</div>
            <div className="text-sm font-medium text-zinc-200 truncate" title={tx.description || ""}>
              {tx.description || "—"}
            </div>
            <div className="text-[11px] text-zinc-500">Journal Entry Memo</div>
          </div>

          {/* Entry Legs */}
          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Double-Entry Legs</div>
            <div className="text-xl font-bold font-mono text-white" data-testid="entry-count-value">
              {entryCount}
            </div>
            <div className="text-[11px] text-zinc-500">Immutable Balanced Records</div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
          <span className="text-zinc-500">Posted At:</span>{" "}
          <span className="font-mono text-zinc-300">{formattedCreatedAt}</span>
        </div>
      </section>

      {/* Section 2: Ledger Entries Table */}
      <section
        data-testid="ledger-entries-section"
        aria-labelledby="entries-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="entries-heading" className="text-base font-semibold text-zinc-100">
              Double-Entry Ledger Legs
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {entryCount} Leg(s)
          </span>
        </div>

        {tx.entries && tx.entries.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table
              data-testid="ledger-entries-detail-table"
              className="w-full text-left text-xs text-zinc-300"
            >
              <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Seq</th>
                  <th scope="col" className="py-2.5 px-3">Entry ID</th>
                  <th scope="col" className="py-2.5 px-3">Account ID</th>
                  <th scope="col" className="py-2.5 px-3">Direction</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Amount</th>
                  <th scope="col" className="py-2.5 px-3">Currency</th>
                  <th scope="col" className="py-2.5 px-3">Created At</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Account Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {tx.entries.map((entry) => (
                  <tr
                    key={entry.id}
                    data-testid={`entry-row-${entry.id}`}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-400">
                      {entry.sequenceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">
                      <span title={entry.id}>{entry.id.slice(0, 12)}...</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-200">
                      <span title={entry.accountId}>{entry.accountId}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <LedgerDirectionBadge direction={entry.direction} />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-white">
                      {formatMoney(entry.amountMinor, entry.currency)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">
                      {entry.currency}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">
                      {new Date(entry.createdAt).toLocaleTimeString("en-US")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/admin/ledger/accounts/${entry.accountId}`}
                        data-testid={`account-ledger-link-${entry.accountId}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors focus:outline-none focus-visible:underline"
                      >
                        <Wallet className="w-3 h-3" aria-hidden="true" />
                        <span>Account Ledger</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800">
            No entries recorded for this ledger transaction.
          </div>
        )}
      </section>
    </div>
  );
}
