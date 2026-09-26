"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminNotifications } from "@/features/admin/hooks/use-admin-notifications";
import { useRunAdminNotificationWorker } from "@/features/admin/hooks/use-admin-notification-mutations";
import { NotificationTable } from "@/features/admin/components/notification-table";
import { NotificationFilters } from "@/features/admin/components/notification-filters";
import { NotificationActionModal } from "@/features/admin/components/notification-action-modal";
import { PaymentPagination } from "@/features/admin/components/payment-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import type { NotificationQueryParams, NotificationStatus } from "@/types/admin";
import { Bell, RefreshCw, Play, CheckCircle2 } from "lucide-react";

function NotificationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParams: NotificationQueryParams = useMemo(() => {
    const pageStr = searchParams.get("page");
    const sizeStr = searchParams.get("size");
    const statusParam = searchParams.get("status") as NotificationStatus | null;

    return {
      page: pageStr ? Math.max(0, parseInt(pageStr, 10)) : 0,
      size: sizeStr ? Math.max(1, Math.min(parseInt(sizeStr, 10), 100)) : 20,
      sort: "createdAt,desc",
      ...(statusParam ? { status: statusParam } : {}),
    };
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminNotifications(queryParams);

  // Worker trigger modal & mutation
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const runWorkerMutation = useRunAdminNotificationWorker({
    onSuccess: (processedCount) => {
      setWorkerModalOpen(false);
      setSuccessNotice(`Notification worker executed successfully. Processed ${processedCount} message(s).`);
      refetch();
    },
  });

  const updateUrlParams = (
    newParams: Partial<NotificationQueryParams>,
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
    if (merged.status) sp.set("status", merged.status);

    const queryStr = sp.toString();
    router.push(`/admin/notifications${queryStr ? `?${queryStr}` : ""}`);
  };

  const handleApplyFilters = (filters: NotificationQueryParams) => {
    updateUrlParams(filters, true);
  };

  const handleResetFilters = () => {
    router.push("/admin/notifications");
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage });
  };

  const notifications = data?.content || [];
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
            <Bell className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1
              data-testid="notifications-heading"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
            >
              Notification Operations
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Outbox notification lifecycle, delivery verification, and multi-channel dispatch monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWorkerModalOpen(true)}
            data-testid="run-notification-worker-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Run Worker</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="refresh-notifications-button"
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

      {/* Success Notification Banner */}
      {successNotice && (
        <div
          data-testid="notification-worker-success-banner"
          className="p-4 rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-xs text-emerald-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Component */}
      <NotificationFilters
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
          title="Failed to Load Notifications"
        />
      ) : (
        <div className="space-y-4">
          <NotificationTable notifications={notifications} isLoading={isLoading} />

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

      {/* Run Worker Confirmation Modal */}
      <NotificationActionModal
        isOpen={workerModalOpen}
        onClose={() => setWorkerModalOpen(false)}
        onConfirm={() => runWorkerMutation.mutate({ limit: 50 })}
        title="Trigger Outbox Notification Worker"
        description="Initiate an asynchronous background processing sweep to dispatch pending outbox notifications."
        actionLabel="Run Dispatch Sweep"
        consequence="Authoritative notification delivery attempts will be dispatched to provider gateways. Records will be updated in PostgreSQL."
        isPending={runWorkerMutation.isPending}
      />
    </div>
  );
}

export default function NotificationsPage() {
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
      <NotificationsContent />
    </Suspense>
  );
}
