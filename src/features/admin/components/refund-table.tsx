"use client";

import React from "react";
import Link from "next/link";
import { RotateCcw, ArrowRight, ExternalLink } from "lucide-react";
import { AdminRefundStatusBadge } from "./refund-status-badge";
import { formatMoney } from "@/features/payments/utils/money-parser";
import type { RefundAdminResponse } from "@/types/admin";

export interface RefundTableProps {
  refunds: RefundAdminResponse[];
  isLoading: boolean;
}

export function RefundTable({ refunds, isLoading }: RefundTableProps) {
  if (isLoading) {
    return (
      <div
        data-testid="refund-table-skeleton"
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3"
      >
        <div className="h-5 w-48 bg-zinc-800/60 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-zinc-800/30 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div
        data-testid="refund-table-empty"
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3 text-zinc-500">
          <RotateCcw className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">
          No refunds found
        </h3>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
          No administrative refund records match the current query parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-xs text-zinc-300"
          aria-label="Admin Refunds Directory"
          data-testid="admin-refunds-table"
        >
          <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">Refund ID</th>
              <th scope="col" className="px-4 py-3">Payment Ref</th>
              <th scope="col" className="px-4 py-3">Authoritative Amount</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Provider Ref</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {refunds.map((r) => {
              const formattedDate = new Date(r.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedAmount = formatMoney(r.amountMinor, r.currency);

              return (
                <tr
                  key={r.id}
                  data-testid={`refund-row-${r.id}`}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  {/* ID */}
                  <td className="px-4 py-3 font-mono font-medium text-zinc-200">
                    <span className="sr-only">{r.id}</span>
                    <span aria-hidden="true" title={r.id}>
                      {r.id.slice(0, 8)}...
                    </span>
                  </td>

                  {/* Payment ID Link */}
                  <td className="px-4 py-3 font-mono">
                    <Link
                      href={`/admin/investigations/payments/${r.paymentId}`}
                      title={r.paymentId}
                      aria-label={`View investigation for payment ${r.paymentId}`}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                    >
                      <span className="sr-only">{r.paymentId}</span>
                      <span aria-hidden="true">{r.paymentId.slice(0, 8)}...</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 font-mono font-semibold text-zinc-100">
                    {formattedAmount}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <AdminRefundStatusBadge status={r.status} />
                  </td>

                  {/* Provider Reference */}
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {r.providerReference || "—"}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/refunds/${r.id}`}
                      data-testid={`view-refund-${r.id}-link`}
                      aria-label={`Inspect refund ${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 focus:outline-none focus:underline"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
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
