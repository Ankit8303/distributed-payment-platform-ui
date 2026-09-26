"use client";

import React, { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminRefunds } from "@/features/admin/hooks/use-admin-refunds";
import { RefundTable } from "@/features/admin/components/refund-table";
import { RefundFilters } from "@/features/admin/components/refund-filters";
import { PaymentPagination } from "@/features/admin/components/payment-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import type { RefundQueryParams, RefundStatus } from "@/types/admin";
import { RotateCcw, RefreshCw } from "lucide-react";

function RefundsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParams: RefundQueryParams = useMemo(() => {
    const pageStr = searchParams.get("page");
    const sizeStr = searchParams.get("size");
    const paymentIdParam = searchParams.get("paymentId");
    const statusParam = searchParams.get("status") as RefundStatus | null;

    return {
      page: pageStr ? Math.max(0, parseInt(pageStr, 10)) : 0,
      size: sizeStr ? Math.max(1, Math.min(parseInt(sizeStr, 10), 100)) : 20,
      sort: "createdAt,desc",
      ...(paymentIdParam && paymentIdParam.trim() ? { paymentId: paymentIdParam.trim() } : {}),
      ...(statusParam ? { status: statusParam } : {}),
    };
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminRefunds(queryParams);

  const updateUrlParams = (
    newParams: Partial<RefundQueryParams>,
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
    if (merged.paymentId) sp.set("paymentId", merged.paymentId);
    if (merged.status) sp.set("status", merged.status);

    const queryStr = sp.toString();
    router.push(`/admin/refunds${queryStr ? `?${queryStr}` : ""}`);
  };

  const handleApplyFilters = (filters: RefundQueryParams) => {
    updateUrlParams(filters, true);
  };

  const handleResetFilters = () => {
    router.push("/admin/refunds");
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage });
  };

  const refunds = data?.content || [];
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
            <RotateCcw className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1
              data-testid="admin-refunds-heading"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
            >
              Refund Oversight
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Administrative inspection and governance of customer refund transactions and gateway references
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="refresh-refunds-button"
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
      <RefundFilters
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
          title="Failed to Load Refunds"
        />
      ) : (
        <div className="space-y-4">
          <RefundTable refunds={refunds} isLoading={isLoading} />

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

export default function AdminRefundsPage() {
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
      <RefundsContent />
    </Suspense>
  );
}
