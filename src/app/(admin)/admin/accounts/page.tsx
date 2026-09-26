"use client";

import React, { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAccounts } from "@/features/admin/hooks/use-admin-accounts";
import { AccountFilters } from "@/features/admin/components/account-filters";
import { AccountTable } from "@/features/admin/components/account-table";
import { AccountPagination } from "@/features/admin/components/account-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import type { AccountQueryParams } from "@/types/admin";
import type { AccountStatus, AccountType } from "@/types/account";
import { RefreshCw, Users } from "lucide-react";

function AccountsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse parameters from URL adhering to backend priority: ownerId > status > accountType
  const queryParams: AccountQueryParams = useMemo(() => {
    const pageStr = searchParams.get("page");
    const sizeStr = searchParams.get("size");
    const sortParam = searchParams.get("sort") || "createdAt,desc";
    const ownerIdParam = searchParams.get("ownerId");
    const statusParam = searchParams.get("status") as AccountStatus | null;
    const accountTypeParam = searchParams.get("accountType") as AccountType | null;

    const base: AccountQueryParams = {
      page: pageStr ? Math.max(0, parseInt(pageStr, 10)) : 0,
      size: sizeStr ? Math.max(1, Math.min(parseInt(sizeStr, 10), 100)) : 20,
      sort: sortParam,
    };

    // Enforce priority ladder directly in URL query parameters
    const trimmedOwnerId = ownerIdParam?.trim();
    if (trimmedOwnerId) {
      base.ownerId = trimmedOwnerId;
      return base;
    }

    if (statusParam) {
      base.status = statusParam;
      return base;
    }

    if (accountTypeParam) {
      base.accountType = accountTypeParam;
      return base;
    }

    return base;
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminAccounts(queryParams);

  // Synchronize state with URL search parameters
  const updateUrlParams = (
    newParams: Partial<AccountQueryParams>,
    resetPage = false
  ) => {
    const merged = {
      ...queryParams,
      ...newParams,
      ...(resetPage ? { page: 0 } : {}),
    };

    const sp = new URLSearchParams();
    if (merged.page !== undefined && merged.page > 0) {
      sp.set("page", String(merged.page));
    }
    if (merged.size !== undefined && merged.size !== 20) {
      sp.set("size", String(merged.size));
    }
    if (merged.sort && merged.sort !== "createdAt,desc") {
      sp.set("sort", merged.sort);
    }

    // Apply only the highest priority filter present
    if (merged.ownerId) {
      sp.set("ownerId", merged.ownerId);
    } else if (merged.status) {
      sp.set("status", merged.status);
    } else if (merged.accountType) {
      sp.set("accountType", merged.accountType);
    }

    const queryStr = sp.toString();
    router.push(queryStr ? `/admin/accounts?${queryStr}` : "/admin/accounts");
  };

  const handleApplyFilters = (filters: AccountQueryParams) => {
    // When applying a filter, drop all other filter fields to prevent contradictory params
    const updated: Partial<AccountQueryParams> = {
      ownerId: filters.ownerId,
      status: filters.status,
      accountType: filters.accountType,
    };
    updateUrlParams(updated, true);
  };

  const handleResetFilters = () => {
    router.push("/admin/accounts");
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage });
  };

  const handleSizeChange = (newSize: number) => {
    updateUrlParams({ size: newSize }, true);
  };

  const handleSortChange = (newSort: string) => {
    updateUrlParams({ sort: newSort }, true);
  };

  const accounts = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;
  const currentPage = data?.number ?? queryParams.page ?? 0;
  const currentSize = data?.size ?? queryParams.size ?? 20;

  const hasActiveFilter = Boolean(
    queryParams.ownerId || queryParams.status || queryParams.accountType
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Account Explorer
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Administrative account directory, ownership lookups &amp; status governance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="admin-accounts-refresh-button"
            aria-label="Refresh account directory"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
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
      <AccountFilters
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

      {/* Accounts Table & Pagination */}
      <div className="space-y-0">
        <AccountTable
          accounts={accounts}
          isLoading={isLoading}
          sort={queryParams.sort}
          onSortChange={handleSortChange}
          hasActiveFilter={hasActiveFilter}
          onClearFilter={handleResetFilters}
          emptyMessage="No accounts found."
        />

        {data && (
          <AccountPagination
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

export default function AdminAccountsPage() {
  return (
    <Suspense
      fallback={
        <div
          data-testid="admin-accounts-loading-fallback"
          className="p-8 text-center text-zinc-400 text-sm animate-pulse"
        >
          Loading account directory...
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  );
}
