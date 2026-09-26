"use client";

import React, { Suspense, useTransition, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAdminAccountLedgerEntries } from "@/features/admin/hooks/use-admin-account-ledger-entries";
import { LedgerDirectionBadge } from "@/features/admin/components/investigation-status-badges";
import { LedgerPagination } from "@/features/admin/components/ledger-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import { formatMoney } from "@/features/payments/utils/money-parser";
import type { PageableParams } from "@/types/admin";
import {
  ArrowLeft,
  RefreshCw,
  Wallet,
  Copy,
  Check,
} from "lucide-react";

function AccountLedgerEntriesContent() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const accountId = params?.accountId || "";

  const pageParam = parseInt(searchParams.get("page") || "0", 10);
  const sizeParam = parseInt(searchParams.get("size") || "20", 10);
  const sortParam = searchParams.get("sort") || undefined;

  const page = isNaN(pageParam) || pageParam < 0 ? 0 : pageParam;
  const size = isNaN(sizeParam) || sizeParam < 1 ? 20 : Math.min(sizeParam, 100);

  const queryParams: PageableParams = {
    page,
    size,
    ...(sortParam ? { sort: sortParam } : {}),
  };

  const {
    data: entriesPage,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminAccountLedgerEntries(accountId, queryParams);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const updateQueryParams = (newParams: Partial<PageableParams>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });

    startTransition(() => {
      router.push(`/admin/ledger/accounts/${encodeURIComponent(accountId)}?${nextParams.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: newPage });
  };

  const handleSizeChange = (newSize: number) => {
    updateQueryParams({ size: newSize, page: 0 });
  };

  const entries = entriesPage?.content || [];
  const totalElements = entriesPage?.totalElements || 0;
  const totalPages = entriesPage?.totalPages || 0;

  return (
    <div
      data-testid="admin-account-ledger-container"
      className="space-y-6 max-w-6xl mx-auto pb-12"
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
          data-testid="admin-account-ledger-refresh-button"
          aria-label="Refresh account ledger entries"
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
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Account Ledger Entries
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Account-centric chronological journal of immutable double-entry legs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300">
          <span className="text-zinc-500">Account ID:</span>
          <span data-testid="header-account-id">{accountId}</span>
          <button
            type="button"
            onClick={() => handleCopy(accountId, "accountId")}
            aria-label="Copy Account ID"
            className="text-zinc-400 hover:text-white transition-colors ml-1 focus:outline-none"
          >
            {copiedKey === "accountId" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {/* Entries Table */}
      {!isError && (
        <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
          {isLoading ? (
            <div
              data-testid="admin-account-ledger-loading"
              className="p-6 space-y-3 animate-pulse"
            >
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-zinc-800/40 rounded" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div
              data-testid="admin-account-ledger-empty-state"
              className="flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mb-3">
                <Wallet className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                No ledger entries found
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                No double-entry legs have been recorded for this account.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                data-testid="admin-account-entries-table"
                className="w-full text-left border-collapse text-xs text-zinc-300"
              >
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Seq</th>
                    <th scope="col" className="py-3 px-4">Entry ID</th>
                    <th scope="col" className="py-3 px-4">Direction</th>
                    <th scope="col" className="py-3 px-4 text-right">Amount</th>
                    <th scope="col" className="py-3 px-4">Currency</th>
                    <th scope="col" className="py-3 px-4">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {entries.map((entry) => {
                    const formattedDate = new Date(entry.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    });

                    return (
                      <tr
                        key={entry.id}
                        data-testid={`account-entry-row-${entry.id}`}
                        className="hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-400">
                          {entry.sequenceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300">
                          <span title={entry.id}>{entry.id}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <LedgerDirectionBadge direction={entry.direction} />
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-right text-white">
                          {formatMoney(entry.amountMinor, entry.currency)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">
                          {entry.currency}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-500 whitespace-nowrap">
                          {formattedDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && totalElements > 0 && (
            <LedgerPagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              size={size}
              itemLabel="entries"
              onPageChange={handlePageChange}
              onSizeChange={handleSizeChange}
              isLoading={isFetching}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAccountLedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
        </div>
      }
    >
      <AccountLedgerEntriesContent />
    </Suspense>
  );
}
