"use client";

import React, { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminUsers } from "@/features/admin/hooks/use-admin-users";
import { UserTable } from "@/features/admin/components/user-table";
import { UserFilters } from "@/features/admin/components/user-filters";
import { PaymentPagination } from "@/features/admin/components/payment-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import type { UserQueryParams, UserRole, UserStatus } from "@/types/admin";
import { Users, RefreshCw } from "lucide-react";

function UsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParams: UserQueryParams = useMemo(() => {
    const pageStr = searchParams.get("page");
    const sizeStr = searchParams.get("size");
    const roleParam = searchParams.get("role") as UserRole | null;
    const statusParam = searchParams.get("status") as UserStatus | null;
    const emailParam = searchParams.get("email");

    return {
      page: pageStr ? Math.max(0, parseInt(pageStr, 10)) : 0,
      size: sizeStr ? Math.max(1, Math.min(parseInt(sizeStr, 10), 100)) : 20,
      sort: "createdAt,desc",
      ...(roleParam ? { role: roleParam } : {}),
      ...(statusParam ? { status: statusParam } : {}),
      ...(emailParam && emailParam.trim() ? { email: emailParam.trim() } : {}),
    };
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminUsers(queryParams);

  const updateUrlParams = (
    newParams: Partial<UserQueryParams>,
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
    if (merged.role) sp.set("role", merged.role);
    if (merged.status) sp.set("status", merged.status);
    if (merged.email) sp.set("email", merged.email);

    const queryStr = sp.toString();
    router.push(`/admin/users${queryStr ? `?${queryStr}` : ""}`);
  };

  const handleApplyFilters = (filters: UserQueryParams) => {
    updateUrlParams(filters, true);
  };

  const handleResetFilters = () => {
    router.push("/admin/users");
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage });
  };

  const users = data?.content || [];
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
            <Users className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1
              data-testid="user-governance-heading"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
            >
              User Directory
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Administrative user governance, identity profile inspection, and credential lifecycle status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="refresh-users-button"
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
      <UserFilters
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
          title="Failed to Load User Directory"
        />
      ) : (
        <div className="space-y-4">
          <UserTable users={users} isLoading={isLoading} />

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

export default function UserGovernancePage() {
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
      <UsersContent />
    </Suspense>
  );
}
