"use client";

import React, { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminPayments } from "@/features/admin/hooks/use-admin-payments";
import { PaymentFilters } from "@/features/admin/components/payment-filters";
import { PaymentTable } from "@/features/admin/components/payment-table";
import { PaymentPagination } from "@/features/admin/components/payment-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import type { PaymentQueryParams, PaymentStatus } from "@/types/admin";
import { RefreshCw, CreditCard } from "lucide-react";

function PaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse parameters from URL
  const queryParams: PaymentQueryParams = useMemo(() => {
    const pageStr = searchParams.get("page");
    const sizeStr = searchParams.get("size");
    const statusParam = searchParams.get("status") as PaymentStatus | null;
    const payer = searchParams.get("payerAccountId");
    const payee = searchParams.get("payeeAccountId");

    return {
      page: pageStr ? Math.max(0, parseInt(pageStr, 10)) : 0,
      size: sizeStr ? Math.max(1, Math.min(parseInt(sizeStr, 10), 100)) : 20,
      sort: "createdAt,desc",
      ...(statusParam ? { status: statusParam } : {}),
      ...(payer ? { payerAccountId: payer } : {}),
      ...(payee ? { payeeAccountId: payee } : {}),
    };
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminPayments(queryParams);

  // Update URL parameters
  const updateUrlParams = (newParams: Partial<PaymentQueryParams>, resetPage = false) => {
    const merged = {
      ...queryParams,
      ...newParams,
      ...(resetPage ? { page: 0 } : {}),
    };

    const sp = new URLSearchParams();
    if (merged.page !== undefined && merged.page > 0) sp.set("page", String(merged.page));
    if (merged.size !== undefined && merged.size !== 20) sp.set("size", String(merged.size));
    if (merged.status) sp.set("status", merged.status);
    if (merged.payerAccountId) sp.set("payerAccountId", merged.payerAccountId);
    if (merged.payeeAccountId) sp.set("payeeAccountId", merged.payeeAccountId);

    const queryStr = sp.toString();
    router.push(queryStr ? `/admin/payments?${queryStr}` : "/admin/payments");
  };

  const handleApplyFilters = (filters: PaymentQueryParams) => {
    updateUrlParams(filters, true);
  };

  const handleResetFilters = () => {
    router.push("/admin/payments");
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage });
  };

  const handleSizeChange = (newSize: number) => {
    updateUrlParams({ size: newSize }, true);
  };

  const payments = data?.content || [];
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
            <CreditCard className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Payments
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Administrative payment operations & monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="admin-payments-refresh-button"
            aria-label="Refresh payment records"
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
      <PaymentFilters
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

      {/* Payments Table & Pagination */}
      <div className="space-y-0">
        <PaymentTable
          payments={payments}
          isLoading={isLoading}
          emptyMessage="No payments found."
        />

        {data && (
          <PaymentPagination
            page={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            size={currentSize}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
            isLoading={isFetching}
          />
        )}
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-zinc-400 text-sm animate-pulse">
          Loading payment operations...
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
