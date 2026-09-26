"use client";

import React, { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminPayouts } from "@/features/admin/hooks/use-admin-payouts";
import { PayoutTable } from "@/features/admin/components/payout-table";
import { PayoutFilters } from "@/features/admin/components/payout-filters";
import { PaymentPagination } from "@/features/admin/components/payment-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import type { PayoutQueryParams, PayoutStatus } from "@/types/admin";
import { ArrowUpRight, RefreshCw } from "lucide-react";

function PayoutsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParams: PayoutQueryParams = useMemo(() => {
    const pageStr = searchParams.get("page");
    const sizeStr = searchParams.get("size");
    const accountIdParam = searchParams.get("accountId");
    const statusParam = searchParams.get("status") as PayoutStatus | null;

    return {
      page: pageStr ? Math.max(0, parseInt(pageStr, 10)) : 0,
      size: sizeStr ? Math.max(1, Math.min(parseInt(sizeStr, 10), 100)) : 20,
      sort: "createdAt,desc",
      ...(accountIdParam && accountIdParam.trim() ? { accountId: accountIdParam.trim() } : {}),
      ...(statusParam ? { status: statusParam } : {}),
    };
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminPayouts(queryParams);

  const updateUrlParams = (
    newParams: Partial<PayoutQueryParams>,
    resetPage = false
  ) => {
    const merged = {
      ...queryParams,
      ...newParams,
      ...(resetPage ? { page: 0 } : {}),
    };

    const sp = new URLSearchParams();
    if (merged.page !== undefined && merged.page > 0) sp.set("page", String(merged.page));
    if (merged.size !== undefined && merged.size !== 20) sp.set("size", String(merged.size));
    if (merged.accountId) sp.set("accountId", merged.accountId);
    if (merged.status) sp.set("status", merged.status);

    const queryStr = sp.toString();
    router.push(`/admin/payouts${queryStr ? `?${queryStr}` : ""}`);
  };

  const handleApplyFilters = (filters: PayoutQueryParams) => {
    updateUrlParams(filters, true);
  };

  const handleResetFilters = () => {
    router.push("/admin/payouts");
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage });
  };

  const payouts = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;
  const currentPage = data?.number ?? queryParams.page ?? 0;
  const currentSize = data?.size ?? queryParams.size ?? 20;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1
              data-testid="admin-payouts-heading"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
            >
              Payout Oversight
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Administrative inspection and governance of merchant disbursement payouts and gateway references
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="refresh-payouts-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Component */}
      <PayoutFilters
        initialFilters={queryParams}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        isLoading={isLoading}
      />

      {/* Content State */}
      {isError ? (
        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to Load Payouts"
        />
      ) : (
        <div className="space-y-4">
          <PayoutTable payouts={payouts} isLoading={isLoading} />

          {/* Pagination */}
          {!isLoading && totalElements > 0 && (
            <PaymentPagination
              page={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              size={currentSize}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPayoutsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 w-48 bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-28 bg-zinc-800/20 rounded-xl animate-pulse" />
          <div className="h-64 bg-zinc-800/20 rounded-xl animate-pulse" />
        </div>
      }
    >
      <PayoutsContent />
    </Suspense>
  );
}
