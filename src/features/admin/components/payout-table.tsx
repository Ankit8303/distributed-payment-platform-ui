"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, ExternalLink } from "lucide-react";
import { AdminPayoutStatusBadge } from "./payout-status-badge";
import { formatMoney } from "@/features/payments/utils/money-parser";
import { formatDateTime } from "@/lib/formatting/date";
import type { PayoutAdminResponse } from "@/types/admin";

export interface PayoutTableProps {
  payouts: PayoutAdminResponse[];
  isLoading: boolean;
}

export function PayoutTable({ payouts, isLoading }: PayoutTableProps) {
  if (isLoading) {
    return (
      <div
        data-testid="payout-table-skeleton"
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

  if (payouts.length === 0) {
    return (
      <div
        data-testid="payout-table-empty"
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3 text-zinc-500">
          <ArrowUpRight className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">
          No payouts found
        </h3>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
          No administrative payout records match the current query parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-xs text-zinc-300"
          aria-label="Admin Payouts Directory"
          data-testid="admin-payouts-table"
        >
          <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">Payout ID</th>
              <th scope="col" className="px-4 py-3">Account Reference</th>
              <th scope="col" className="px-4 py-3">Authoritative Amount</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Provider Ref</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {payouts.map((p) => {
              const formattedDate = formatDateTime(p.createdAt, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedAmount = formatMoney(p.amountMinor, p.currency);

              return (
                <tr
                  key={p.id}
                  data-testid={`payout-row-${p.id}`}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  {/* ID */}
                  <td className="px-4 py-3 font-mono font-medium text-zinc-200">
                    <span className="sr-only">{p.id}</span>
                    <span aria-hidden="true" title={p.id}>
                      {p.id.slice(0, 8)}...
                    </span>
                  </td>

                  {/* Account ID Link */}
                  <td className="px-4 py-3 font-mono">
                    <Link
                      href={`/admin/accounts/${p.accountId}`}
                      title={p.accountId}
                      aria-label={`View account ${p.accountId}`}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                    >
                      <span className="sr-only">{p.accountId}</span>
                      <span aria-hidden="true">{p.accountId.slice(0, 8)}...</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 font-mono font-semibold text-zinc-100">
                    {formattedAmount}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <AdminPayoutStatusBadge status={p.status} />
                  </td>

                  {/* Provider Reference */}
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {p.providerReference || "—"}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/payouts/${p.id}`}
                      data-testid={`view-payout-${p.id}-link`}
                      aria-label={`Inspect payout ${p.id}`}
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
