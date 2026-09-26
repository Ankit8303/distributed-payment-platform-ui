"use client";

import React, { Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminLedgerTransactions } from "@/features/admin/hooks/use-admin-ledger-transactions";
import { LedgerTransactionTable } from "@/features/admin/components/ledger-transaction-table";
import { LedgerFilters } from "@/features/admin/components/ledger-filters";
import { LedgerPagination } from "@/features/admin/components/ledger-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import type { LedgerQueryParams } from "@/types/admin";
import { BookOpen, RefreshCw } from "lucide-react";

function LedgerTransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Extract query parameters from URL
  const sourceReferenceType = searchParams.get("sourceReferenceType") || undefined;
  const pageParam = parseInt(searchParams.get("page") || "0", 10);
  const sizeParam = parseInt(searchParams.get("size") || "20", 10);
  const sortParam = searchParams.get("sort") || undefined;

  const page = isNaN(pageParam) || pageParam < 0 ? 0 : pageParam;
  const size = isNaN(sizeParam) || sizeParam < 1 ? 20 : Math.min(sizeParam, 100);

  const queryParams: LedgerQueryParams = {
    page,
    size,
    ...(sourceReferenceType ? { sourceReferenceType } : {}),
    ...(sortParam ? { sort: sortParam } : {}),
  };

  const {
    data: transactionsPage,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminLedgerTransactions(queryParams);

  const updateQueryParams = (newParams: Partial<LedgerQueryParams>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    startTransition(() => {
      router.push(`/admin/ledger/transactions?${params.toString()}`);
    });
  };

  const handleApplyFilters = (filters: LedgerQueryParams) => {
    updateQueryParams({
      sourceReferenceType: filters.sourceReferenceType,
      page: 0, // Reset to first page upon filter change
    });
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams();
    params.set("page", "0");
    params.set("size", size.toString());
    startTransition(() => {
      router.push(`/admin/ledger/transactions?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: newPage });
  };

  const handleSizeChange = (newSize: number) => {
    updateQueryParams({ size: newSize, page: 0 });
  };

  const transactions = transactionsPage?.content || [];
  const totalElements = transactionsPage?.totalElements || 0;
  const totalPages = transactionsPage?.totalPages || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ledger Transactions
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Authoritative double-entry immutable accounting journal
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="admin-ledger-refresh-button"
            aria-label="Refresh ledger records"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <LedgerFilters
        initialFilters={queryParams}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        isLoading={isFetching}
      />

      {/* Error state */}
      {isError && (
        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {/* Transactions Table & Pagination */}
      {!isError && (
        <div className="space-y-0">
          <LedgerTransactionTable
            transactions={transactions}
            isLoading={isLoading}
          />

          {!isLoading && totalElements > 0 && (
            <LedgerPagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              size={size}
              itemLabel="transactions"
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

export default function AdminLedgerTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-28 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
        </div>
      }
    >
      <LedgerTransactionsContent />
    </Suspense>
  );
}
