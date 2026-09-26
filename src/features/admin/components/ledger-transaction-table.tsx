"use client";

import React from "react";
import Link from "next/link";
import type { LedgerTransactionAdminResponse } from "@/types/admin";
import { formatDateTime } from "@/lib/formatting/date";
import { BookOpen, ExternalLink, ArrowRight } from "lucide-react";

export interface LedgerTransactionTableProps {
  transactions: LedgerTransactionAdminResponse[];
  isLoading?: boolean;
}

export const LedgerTransactionTable: React.FC<LedgerTransactionTableProps> = ({
  transactions,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="admin-ledger-loading-skeleton"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm"
      >
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 animate-pulse">
          <div className="h-4 w-40 bg-zinc-800 rounded" />
        </div>
        <div className="divide-y divide-zinc-800/60 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-800/40 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div
        data-testid="admin-ledger-empty-state"
        className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-xl shadow-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mb-3">
          <BookOpen className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">No ledger transactions found</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          No double-entry transactions match the current filter criteria or the ledger has not yet recorded transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
      <div className="overflow-x-auto">
        <table
          data-testid="admin-ledger-transactions-table"
          className="w-full text-left border-collapse text-xs text-zinc-300"
        >
          <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th scope="col" className="py-3 px-4">Transaction ID</th>
              <th scope="col" className="py-3 px-4">Source Reference</th>
              <th scope="col" className="py-3 px-4">Source Type</th>
              <th scope="col" className="py-3 px-4">Description</th>
              <th scope="col" className="py-3 px-4 text-center">Entries</th>
              <th scope="col" className="py-3 px-4">Created At</th>
              <th scope="col" className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {transactions.map((tx) => {
              const formattedDate = formatDateTime(tx.createdAt, {
                dateStyle: "medium",
                timeStyle: "medium",
              });
              const entryCount = tx.entries?.length || 0;
              const isPayment = tx.sourceReferenceType === "PAYMENT";

              return (
                <tr
                  key={tx.id}
                  data-testid={`ledger-tx-row-${tx.id}`}
                  className="hover:bg-zinc-800/40 transition-colors group"
                >
                  {/* Transaction ID */}
                  <td className="py-3.5 px-4 font-mono font-medium text-zinc-200">
                    <span title={tx.id}>
                      {tx.id.slice(0, 14)}...
                    </span>
                  </td>

                  {/* Source Reference */}
                  <td className="py-3.5 px-4 font-mono text-zinc-400">
                    {isPayment ? (
                      <Link
                        href={`/admin/payments/${tx.sourceReferenceId}`}
                        title={`View Payment: ${tx.sourceReferenceId}`}
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none focus-visible:underline"
                      >
                        <span>{tx.sourceReferenceId.slice(0, 12)}...</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </Link>
                    ) : (
                      <span title={tx.sourceReferenceId}>
                        {tx.sourceReferenceId.slice(0, 12)}...
                      </span>
                    )}
                  </td>

                  {/* Source Type Badge */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {tx.sourceReferenceType}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="py-3.5 px-4 text-zinc-300 max-w-xs truncate" title={tx.description || ""}>
                    {tx.description || "—"}
                  </td>

                  {/* Entry Count */}
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-zinc-300">
                    <span className="px-2 py-0.5 bg-zinc-950 rounded border border-zinc-800">
                      {entryCount}
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/admin/ledger/transactions/${tx.id}`}
                      data-testid={`view-ledger-tx-${tx.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
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
};
