"use client";

import React from "react";
import { useAdminDashboard } from "@/features/admin/hooks/use-admin-dashboard";
import { KpiCard } from "@/features/admin/components/kpi-card";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import {
  Users,
  Wallet,
  CheckCircle2,
  Lock,
  Receipt,
  CheckCircle,
  AlertTriangle,
  Clock,
  Scale,
  Bell,
  RefreshCw,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminDashboard();

  return (
    <div className="space-y-8">
      {/* Header section with H1 and Manual Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Administrative operational overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="admin-dashboard-refresh-button"
            aria-label="Refresh dashboard data"
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

      {/* Critical Error State when no cached data exists */}
      {isError && !data && (
        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {/* Non-fatal Error banner when cached data exists */}
      {isError && data && (
        <AdminErrorState
          error={error}
          title="Background Refresh Failed"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {/* 1. User & Account Overview */}
      <section
        aria-labelledby="heading-user-account-overview"
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2
            id="heading-user-account-overview"
            className="text-lg font-bold text-zinc-200 tracking-tight"
          >
            User & Account Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Users"
            value={data?.totalUsers}
            isLoading={isLoading}
            icon={Users}
            description="Registered platform identities"
            testId="kpi-total-users"
          />

          <KpiCard
            title="Total Accounts"
            value={data?.totalAccounts}
            isLoading={isLoading}
            icon={Wallet}
            description="Materialized ledger accounts"
            testId="kpi-total-accounts"
          />

          <KpiCard
            title="Active Accounts"
            value={data?.activeAccounts}
            isLoading={isLoading}
            icon={CheckCircle2}
            variant="success"
            statusBadge={{ label: "Operating", variant: "success" }}
            testId="kpi-active-accounts"
          />

          <KpiCard
            title="Frozen Accounts"
            value={data?.frozenAccounts}
            isLoading={isLoading}
            icon={Lock}
            variant={
              data?.frozenAccounts && data.frozenAccounts > 0
                ? "warning"
                : "default"
            }
            statusBadge={
              data?.frozenAccounts && data.frozenAccounts > 0
                ? { label: "Requires Attention", variant: "warning" }
                : { label: "Normal", variant: "neutral" }
            }
            testId="kpi-frozen-accounts"
          />
        </div>
      </section>

      {/* 2. Payment Overview */}
      <section
        aria-labelledby="heading-payment-overview"
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2
            id="heading-payment-overview"
            className="text-lg font-bold text-zinc-200 tracking-tight"
          >
            Payment Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Payments"
            value={data?.totalPayments}
            isLoading={isLoading}
            icon={Receipt}
            description="Total lifetime payment transactions"
            testId="kpi-total-payments"
          />

          <KpiCard
            title="Settled Payments"
            value={data?.settledPayments}
            isLoading={isLoading}
            icon={CheckCircle}
            variant="success"
            statusBadge={{ label: "Settled", variant: "success" }}
            testId="kpi-settled-payments"
          />

          <KpiCard
            title="Failed Payments"
            value={data?.failedPayments}
            isLoading={isLoading}
            icon={AlertTriangle}
            variant={
              data?.failedPayments && data.failedPayments > 0
                ? "danger"
                : "default"
            }
            statusBadge={
              data?.failedPayments && data.failedPayments > 0
                ? { label: "Terminal Failures", variant: "danger" }
                : { label: "Zero Failures", variant: "neutral" }
            }
            testId="kpi-failed-payments"
          />

          <KpiCard
            title="Pending Reconciliation Payments"
            value={data?.pendingReconciliationPayments}
            isLoading={isLoading}
            icon={Clock}
            variant={
              data?.pendingReconciliationPayments &&
              data.pendingReconciliationPayments > 0
                ? "warning"
                : "default"
            }
            statusBadge={
              data?.pendingReconciliationPayments &&
              data.pendingReconciliationPayments > 0
                ? { label: "Pending Sync", variant: "warning" }
                : { label: "Synchronized", variant: "neutral" }
            }
            testId="kpi-pending-reconciliation"
          />
        </div>
      </section>

      {/* 3. Operations & System Overview */}
      <section
        aria-labelledby="heading-operations-overview"
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2
            id="heading-operations-overview"
            className="text-lg font-bold text-zinc-200 tracking-tight"
          >
            Operations & System Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard
            title="Open Reconciliation Cases"
            value={data?.openReconciliationCases}
            isLoading={isLoading}
            icon={Scale}
            variant={
              data?.openReconciliationCases &&
              data.openReconciliationCases > 0
                ? "warning"
                : "default"
            }
            statusBadge={
              data?.openReconciliationCases &&
              data.openReconciliationCases > 0
                ? { label: "Active Cases", variant: "warning" }
                : { label: "All Clear", variant: "neutral" }
            }
            description="Unresolved ledger discrepancy cases"
            testId="kpi-open-reconciliation-cases"
          />

          <KpiCard
            title="Total Notifications"
            value={data?.totalNotifications}
            isLoading={isLoading}
            icon={Bell}
            description="Aggregated notification events processed"
            testId="kpi-total-notifications"
          />
        </div>
      </section>
    </div>
  );
}
