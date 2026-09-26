"use client";

import React from "react";
import Link from "next/link";
import {
  ReconciliationStatusBadge,
  DiscrepancyBadge,
  OperationTypeBadge,
} from "./reconciliation-status-badge";
import type { ReconciliationCaseAdminResponse } from "@/types/admin";
import { formatDateTime } from "@/lib/formatting/date";
import { ChevronRight, GitCompare } from "lucide-react";

export interface ReconciliationTableProps {
  cases: ReconciliationCaseAdminResponse[];
  isLoading?: boolean;
}

export function ReconciliationTable({
  cases,
  isLoading = false,
}: ReconciliationTableProps) {
  if (isLoading) {
    return (
      <div
        data-testid="reconciliation-table-loading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-zinc-800/60 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div
        data-testid="reconciliation-table-empty"
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3 text-zinc-500">
          <GitCompare className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">
          No reconciliation cases found
        </h3>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
          No discrepancy cases match the current query parameters. Authoritative ledger records remain verified.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-xs text-zinc-300"
          aria-label="Reconciliation Cases"
          data-testid="reconciliation-cases-table"
        >
          <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">Case ID</th>
              <th scope="col" className="px-4 py-3">Operation</th>
              <th scope="col" className="px-4 py-3">Discrepancy</th>
              <th scope="col" className="px-4 py-3">Local Status</th>
              <th scope="col" className="px-4 py-3">Case Status</th>
              <th scope="col" className="px-4 py-3 text-center">Attempts</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {cases.map((c) => {
              const formattedDate = formatDateTime(c.createdAt, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <tr
                  key={c.id}
                  data-testid={`reconciliation-row-${c.id}`}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  {/* Case ID */}
                  <td className="px-4 py-3 font-mono font-medium text-zinc-200">
                    <span className="sr-only">{c.id}</span>
                    <span aria-hidden="true" title={c.id}>
                      {c.id.slice(0, 8)}...
                    </span>
                  </td>

                  {/* Operation */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <OperationTypeBadge operationType={c.operationType} />
                      <span className="font-mono text-[10px] text-zinc-400" title={c.operationId}>
                        {c.operationId.slice(0, 8)}...
                      </span>
                    </div>
                  </td>

                  {/* Discrepancy */}
                  <td className="px-4 py-3">
                    <DiscrepancyBadge type={c.discrepancyType} />
                  </td>

                  {/* Local Status */}
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    {c.localStatus}
                  </td>

                  {/* Case Status */}
                  <td className="px-4 py-3">
                    <ReconciliationStatusBadge status={c.reconciliationStatus} />
                  </td>

                  {/* Attempts */}
                  <td className="px-4 py-3 text-center font-mono">
                    {c.attemptCount}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/reconciliation/${c.id}`}
                      data-testid={`view-case-button-${c.id}`}
                      aria-label={`View case ${c.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
