"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminReconciliationCases } from "@/features/admin/hooks/use-admin-reconciliation-cases";
import {
  useRunReconciliationSweep,
  useAuditReconciliationLedger,
  useAuditReconciliationBalances,
} from "@/features/admin/hooks/use-admin-reconciliation-mutations";
import { ReconciliationTable } from "@/features/admin/components/reconciliation-table";
import { ReconciliationFilters } from "@/features/admin/components/reconciliation-filters";
import { PaymentPagination } from "@/features/admin/components/payment-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import { ReconciliationActionModal } from "@/features/admin/components/reconciliation-action-modal";
import {
  ReconciliationAuditModal,
  type AuditType,
} from "@/features/admin/components/reconciliation-audit-modal";
import type {
  ReconciliationQueryParams,
  ReconciliationStatus,
  ReconciliationLedgerAuditReport,
  ReconciliationBalanceAuditReport,
} from "@/types/admin";
import { GitCompare, RefreshCw, Play, Scale, CheckCircle2 } from "lucide-react";

function ReconciliationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse parameters from URL
  const queryParams: ReconciliationQueryParams = useMemo(() => {
    const pageStr = searchParams.get("page");
    const sizeStr = searchParams.get("size");
    const statusParam = searchParams.get("status") as ReconciliationStatus | null;

    return {
      page: pageStr ? Math.max(0, parseInt(pageStr, 10)) : 0,
      size: sizeStr ? Math.max(1, Math.min(parseInt(sizeStr, 10), 100)) : 20,
      sort: "createdAt,desc",
      ...(statusParam ? { status: statusParam } : {}),
    };
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminReconciliationCases(queryParams);

  // Sweep worker mutation
  const [sweepModalOpen, setSweepModalOpen] = useState(false);
  const [sweepResult, setSweepResult] = useState<number | null>(null);

  const runSweepMutation = useRunReconciliationSweep({
    onSuccess: (processedCount) => {
      setSweepResult(processedCount);
      setSweepModalOpen(false);
    },
  });

  // Audit modals state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditType, setAuditType] = useState<AuditType>("ledger");
  const [ledgerReport, setLedgerReport] =
    useState<ReconciliationLedgerAuditReport | null>(null);
  const [balanceReport, setBalanceReport] =
    useState<ReconciliationBalanceAuditReport | null>(null);

  const auditLedgerMutation = useAuditReconciliationLedger({
    onSuccess: (report) => {
      setLedgerReport(report);
    },
  });

  const auditBalancesMutation = useAuditReconciliationBalances({
    onSuccess: (report) => {
      setBalanceReport(report);
    },
  });

  // URL State Updates
  const updateUrlParams = (
    newParams: Partial<ReconciliationQueryParams>,
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
    router.push(queryStr ? `/admin/reconciliation?${queryStr}` : "/admin/reconciliation");
  };

  const handleApplyFilters = (filters: ReconciliationQueryParams) => {
    updateUrlParams(filters, true);
  };

  const handleResetFilters = () => {
    router.push("/admin/reconciliation");
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage });
  };

  const handleSizeChange = (newSize: number) => {
    updateUrlParams({ size: newSize }, true);
  };

  const openAudit = (type: AuditType) => {
    setAuditType(type);
    setAuditModalOpen(true);
  };

  const handleExecuteAudit = () => {
    if (auditType === "ledger") {
      auditLedgerMutation.mutate();
    } else {
      auditBalancesMutation.mutate();
    }
  };

  const cases = data?.content || [];
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
            <GitCompare className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <h1
              data-testid="reconciliation-workspace-heading"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
            >
              Reconciliation
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Administrative discrepancy resolution & ledger integrity oversight
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Audit Reports Trigger */}
          <button
            type="button"
            onClick={() => openAudit("ledger")}
            data-testid="open-ledger-audit-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <Scale className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
            <span>Ledger Audit</span>
          </button>

          <button
            type="button"
            onClick={() => openAudit("balances")}
            data-testid="open-balance-audit-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <Scale className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
            <span>Balance Audit</span>
          </button>

          {/* Trigger Sweep Worker Button */}
          <button
            type="button"
            onClick={() => setSweepModalOpen(true)}
            data-testid="trigger-sweep-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Run Sweep</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="admin-reconciliation-refresh-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Sweep Success Notice */}
      {sweepResult !== null && (
        <div
          data-testid="sweep-result-banner"
          className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-emerald-200 text-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Reconciliation sweep completed. <strong>{sweepResult}</strong> cases processed by backend worker.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSweepResult(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <AdminErrorState
          error={error}
          title="Unable to load reconciliation cases"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {/* Filters */}
      <ReconciliationFilters
        initialFilters={queryParams}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        isLoading={isLoading}
      />

      {/* Data Table */}
      <ReconciliationTable cases={cases} isLoading={isLoading} />

      {/* Pagination */}
      {!isLoading && totalElements > 0 && (
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

      {/* Sweep Confirmation Modal */}
      <ReconciliationActionModal
        isOpen={sweepModalOpen}
        onClose={() => setSweepModalOpen(false)}
        onConfirm={() => runSweepMutation.mutate()}
        title="Execute Reconciliation Sweep"
        actionLabel="Execute Sweep"
        consequence="Dispatches the asynchronous platform reconciliation worker to process pending discrepancy cases."
        isPending={runSweepMutation.isPending}
      />

      {/* Audit Modal */}
      <ReconciliationAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        auditType={auditType}
        onRunAudit={handleExecuteAudit}
        isLoading={
          auditType === "ledger"
            ? auditLedgerMutation.isPending
            : auditBalancesMutation.isPending
        }
        ledgerReport={ledgerReport}
        balanceReport={balanceReport}
      />
    </div>
  );
}

export default function ReconciliationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-zinc-500 text-xs">
          Loading reconciliation workspace...
        </div>
      }
    >
      <ReconciliationContent />
    </Suspense>
  );
}
