"use client";

import React, { Suspense, useTransition, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuditLogs } from "@/features/admin/hooks/use-admin-audit-logs";
import { LedgerPagination } from "@/features/admin/components/ledger-pagination";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import type { AuditQueryParams } from "@/types/admin";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  Shield,
  Copy,
  Check,
  Tag,
} from "lucide-react";

function AuditLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const resourceType = searchParams.get("resourceType") || undefined;
  const resourceId = searchParams.get("resourceId") || undefined;
  const action = searchParams.get("action") || undefined;
  const pageParam = parseInt(searchParams.get("page") || "0", 10);
  const sizeParam = parseInt(searchParams.get("size") || "20", 10);

  const page = isNaN(pageParam) || pageParam < 0 ? 0 : pageParam;
  const size = isNaN(sizeParam) || sizeParam < 1 ? 20 : Math.min(sizeParam, 100);

  const queryParams: AuditQueryParams = {
    page,
    size,
    ...(resourceType ? { resourceType } : {}),
    ...(resourceId ? { resourceId } : {}),
    ...(action ? { action } : {}),
  };

  const {
    data: logsPage,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminAuditLogs(queryParams);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const updateQueryParams = (newParams: Partial<AuditQueryParams>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });

    startTransition(() => {
      router.push(`/admin/audit?${nextParams.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: newPage });
  };

  const handleSizeChange = (newSize: number) => {
    updateQueryParams({ size: newSize, page: 0 });
  };

  const logs = logsPage?.content || [];
  const totalElements = logsPage?.totalElements || 0;
  const totalPages = logsPage?.totalPages || 0;

  // Determine contextual back link
  const backHref =
    resourceType === "ACCOUNT" && resourceId
      ? `/admin/accounts/${encodeURIComponent(resourceId)}`
      : "/admin/dashboard";
  const backLabel =
    resourceType === "ACCOUNT" && resourceId
      ? "Back to Account Inspector"
      : "Back to Dashboard";

  return (
    <div
      data-testid="admin-audit-logs-container"
      className="space-y-6 max-w-6xl mx-auto pb-12"
    >
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href={backHref}
          data-testid="back-to-source-link"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline min-h-[38px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="admin-audit-logs-refresh-button"
          aria-label="Refresh audit logs"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/80 flex items-center justify-center text-purple-400 shadow-sm"
            aria-hidden="true"
          >
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Audit Log Explorer
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Append-only immutable governance and security event records
            </p>
          </div>
        </div>

        {resourceId && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300">
            <span className="text-zinc-500">Resource:</span>
            <span className="text-purple-400 font-semibold">{resourceType || "UNKNOWN"}</span>
            <span data-testid="header-resource-id" className="text-zinc-200">
              {resourceId}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(resourceId, "resourceId")}
              aria-label="Copy Resource ID"
              className="text-zinc-400 hover:text-white transition-colors ml-1 focus:outline-none"
            >
              {copiedKey === "resourceId" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Filter Badge if scoped */}
      {(resourceType || resourceId || action) && (
        <div
          data-testid="audit-filter-banner"
          className="flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400"
        >
          <Tag className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
          <span>Active Filter:</span>
          {resourceType && (
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">
              resourceType: {resourceType}
            </span>
          )}
          {resourceId && (
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">
              resourceId: {resourceId}
            </span>
          )}
          {action && (
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">
              action: {action}
            </span>
          )}
          <Link
            href="/admin/audit"
            className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto font-medium focus:outline-none focus-visible:underline"
          >
            Clear Filters
          </Link>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {/* Audit Logs Table */}
      {!isError && (
        <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
          {isLoading ? (
            <div
              data-testid="admin-audit-logs-loading"
              className="p-6 space-y-3 animate-pulse"
            >
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-zinc-800/40 rounded" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div
              data-testid="admin-audit-logs-empty-state"
              className="flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mb-3">
                <FileText className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                No audit logs found
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                No governance or security events match the current filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                data-testid="admin-audit-logs-table"
                className="w-full text-left border-collapse text-xs text-zinc-300"
              >
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Action</th>
                    <th scope="col" className="py-3 px-4">Resource</th>
                    <th scope="col" className="py-3 px-4">Actor</th>
                    <th scope="col" className="py-3 px-4">Reason / Details</th>
                    <th scope="col" className="py-3 px-4">Correlation ID</th>
                    <th scope="col" className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {logs.map((log) => {
                    const formattedDate = new Date(log.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    });

                    return (
                      <tr
                        key={log.id}
                        data-testid={`audit-log-row-${log.id}`}
                        className="hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300">
                          <div>
                            <span className="text-purple-400 font-semibold">{log.resourceType}:</span>{" "}
                            <span className="text-zinc-400">{log.resourceId}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">
                          <div>
                            <span className="text-zinc-300">{log.actorRole}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {log.actorUserId}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300 max-w-xs truncate">
                          {log.reason || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-500 text-[11px]">
                          {log.correlationId || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-500 whitespace-nowrap">
                          {formattedDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && totalElements > 0 && (
            <LedgerPagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              size={size}
              itemLabel="audit logs"
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

export default function AdminAuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
        </div>
      }
    >
      <AuditLogsContent />
    </Suspense>
  );
}
