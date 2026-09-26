"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useAdminReconciliationCase } from "@/features/admin/hooks/use-admin-reconciliation-case";
import {
  useTriggerReconciliationCase,
  useRetryReconciliationCase,
} from "@/features/admin/hooks/use-admin-reconciliation-mutations";
import {
  ReconciliationStatusBadge,
  DiscrepancyBadge,
  OperationTypeBadge,
} from "@/features/admin/components/reconciliation-status-badge";
import { ReconciliationActionModal } from "@/features/admin/components/reconciliation-action-modal";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import {
  GitCompare,
  ArrowLeft,
  RotateCcw,
  Play,
  ShieldCheck,
  History,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function ReconciliationCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);

  const { data: c, isLoading, isError, error, refetch, isFetching } =
    useAdminReconciliationCase(caseId);

  // Action modals
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const triggerMutation = useTriggerReconciliationCase({
    onSuccess: () => {
      setTriggerModalOpen(false);
      setActionSuccessNotice("Reconciliation execution triggered successfully.");
    },
  });

  const retryMutation = useRetryReconciliationCase({
    onSuccess: () => {
      setRetryModalOpen(false);
      setActionSuccessNotice("Reconciliation resolution retry submitted successfully.");
    },
  });

  if (isLoading) {
    return (
      <div
        data-testid="reconciliation-detail-loading"
        className="p-8 space-y-4 max-w-5xl mx-auto"
      >
        <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
        <div className="h-64 bg-zinc-850/50 rounded-2xl border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (isError || !c) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Link
          href="/admin/reconciliation"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reconciliation Cases</span>
        </Link>
        <AdminErrorState
          error={error || new Error("Reconciliation case could not be retrieved")}
          title="Case Not Found"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const formattedCreated = new Date(c.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedUpdated = new Date(c.updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedResolved = c.resolvedAt
    ? new Date(c.resolvedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div className="space-y-3 pb-3 border-b border-zinc-800">
        <Link
          href="/admin/reconciliation"
          data-testid="back-to-reconciliation-link"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Reconciliation Workspace</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                data-testid="case-detail-heading"
                className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 font-mono"
              >
                Case: {c.id}
              </h1>
              <ReconciliationStatusBadge status={c.reconciliationStatus} />
            </div>
            <p className="text-xs text-zinc-400">
              Operational discrepancy record for {c.operationType} operation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="case-refresh-button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessNotice && (
        <div
          data-testid="action-success-banner"
          className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-emerald-200 text-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* SECTION 1: CASE INFORMATION */}
      <section
        data-testid="case-information-section"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider border-b border-zinc-800/80 pb-2">
          <GitCompare className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <h2>Case Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-zinc-400 block text-[11px]">Case ID</span>
            <span className="font-mono text-zinc-200 font-semibold">{c.id}</span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Operation Type</span>
            <div className="mt-0.5">
              <OperationTypeBadge operationType={c.operationType} />
            </div>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Operation ID</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-zinc-200">
              <span data-testid="case-operation-id">{c.operationId}</span>
              {c.operationType === "PAYMENT" && (
                <Link
                  href={`/admin/investigations/payments/${c.operationId}`}
                  title="Inspect payment forensic trace"
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Local State Status</span>
            <span className="font-mono text-zinc-200 font-medium">{c.localStatus}</span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Attempt Progression</span>
            <span className="font-mono text-zinc-200">
              {c.attemptCount} / {c.maxAttempts} attempts
            </span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Resolution Summary</span>
            <span className="text-zinc-300 font-mono">
              {c.resolution || "Pending Resolution"}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: EVIDENCE */}
      <section
        data-testid="evidence-section"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider border-b border-zinc-800/80 pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <h2>Reconciliation Evidence</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-zinc-400 block text-[11px]">Provider Reference</span>
            <span className="font-mono text-zinc-200" data-testid="evidence-provider-ref">
              {c.providerReference || "None reported"}
            </span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Provider Status</span>
            <span className="font-mono text-zinc-200">
              {c.providerStatus || "Unavailable"}
            </span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Discrepancy Category</span>
            <div className="mt-0.5">
              <DiscrepancyBadge type={c.discrepancyType} />
            </div>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Lease Worker ID</span>
            <span className="font-mono text-zinc-400">
              {c.leaseWorkerId || "None"}
            </span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Lease Expiration</span>
            <span className="font-mono text-zinc-400">
              {c.leaseExpiresAt ? new Date(c.leaseExpiresAt).toLocaleString() : "None"}
            </span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Next Scheduled Attempt</span>
            <span className="font-mono text-zinc-400">
              {c.nextAttemptAt ? new Date(c.nextAttemptAt).toLocaleString() : "None"}
            </span>
          </div>
        </div>

        {c.lastError && (
          <div className="mt-3 p-3 rounded-xl border border-rose-900/60 bg-rose-950/20 text-xs">
            <span className="font-semibold text-rose-300 block mb-1">Last Captured Error:</span>
            <p className="font-mono text-rose-200/90 whitespace-pre-wrap">{c.lastError}</p>
          </div>
        )}
      </section>

      {/* SECTION 3: ACTIONS */}
      <section
        data-testid="actions-section"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider border-b border-zinc-800/80 pb-2">
          <Play className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <h2>Authoritative Actions</h2>
        </div>

        <p className="text-xs text-zinc-400">
          State mutations affect operational reconciliation processing. All actions require explicit confirmation.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Trigger Case Analysis */}
          <button
            type="button"
            onClick={() => setTriggerModalOpen(true)}
            data-testid="trigger-case-button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Trigger Analysis</span>
          </button>

          {/* Retry Resolution */}
          <button
            type="button"
            onClick={() => setRetryModalOpen(true)}
            disabled={c.reconciliationStatus === "RESOLVED"}
            data-testid="retry-case-button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Resolution</span>
          </button>
        </div>
      </section>

      {/* SECTION 4: AUDIT INFORMATION & ATTEMPTS */}
      <section
        data-testid="audit-information-section"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider border-b border-zinc-800/80 pb-2">
          <History className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <h2>Audit Information & Execution History</h2>
        </div>

        {/* Timestamps & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pb-3 border-b border-zinc-800/80">
          <div>
            <span className="text-zinc-400 block text-[11px]">Created At</span>
            <span className="text-zinc-200 font-mono">{formattedCreated}</span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Last Updated</span>
            <span className="text-zinc-200 font-mono">{formattedUpdated}</span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Resolved At</span>
            <span className="text-zinc-200 font-mono">
              {formattedResolved || "Not Resolved"}
            </span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[11px]">Correlation ID</span>
            <span
              className="text-zinc-200 font-mono"
              data-testid="case-correlation-id"
            >
              {c.correlationId || "None"}
            </span>
          </div>
        </div>

        {/* Attempts Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-300">
            Execution Attempts ({c.attempts?.length ?? 0})
          </h3>

          {!c.attempts || c.attempts.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3 italic">
              No reconciliation execution attempts recorded yet.
            </p>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table
                className="w-full text-left text-xs"
                data-testid="attempts-table"
              >
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-center">#</th>
                    <th className="px-3 py-2">Worker ID</th>
                    <th className="px-3 py-2">Action Taken</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Provider Status</th>
                    <th className="px-3 py-2">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {c.attempts.map((att) => (
                    <tr
                      key={att.id}
                      data-testid={`attempt-row-${att.attemptNumber}`}
                      className="hover:bg-zinc-800/30"
                    >
                      <td className="px-3 py-2 text-center font-mono font-bold text-zinc-200">
                        {att.attemptNumber}
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-400">
                        {att.workerId}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {att.actionTaken}
                      </td>
                      <td className="px-3 py-2 font-mono text-amber-300">
                        {att.status}
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-400">
                        {att.providerStatus || "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                        {new Date(att.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Modal: Trigger Analysis */}
      <ReconciliationActionModal
        isOpen={triggerModalOpen}
        onClose={() => setTriggerModalOpen(false)}
        onConfirm={() => triggerMutation.mutate({ caseId: c.id })}
        title="Trigger Reconciliation Analysis"
        actionLabel="Confirm & Trigger"
        caseId={c.id}
        reference={c.providerReference}
        consequence="Dispatches the reconciliation analysis worker for this specific case to evaluate local versus external gateway status."
        isPending={triggerMutation.isPending}
      />

      {/* Confirmation Modal: Retry Resolution */}
      <ReconciliationActionModal
        isOpen={retryModalOpen}
        onClose={() => setRetryModalOpen(false)}
        onConfirm={() => retryMutation.mutate({ caseId: c.id })}
        title="Retry Reconciliation Resolution"
        actionLabel="Confirm & Retry"
        caseId={c.id}
        reference={c.providerReference}
        consequence="Instructs the backend to reattempt resolution for this stalled or failed discrepancy case."
        isPending={retryMutation.isPending}
      />
    </div>
  );
}
