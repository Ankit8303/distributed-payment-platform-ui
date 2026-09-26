"use client";

import React from "react";
import Link from "next/link";
import type { PaymentAdminResponse } from "@/types/admin";
import { PaymentAdminStatusBadge } from "./payment-status-badge";
import { formatMoney } from "@/features/payments/utils/money-parser";
import { formatDateTime } from "@/lib/formatting/date";
import { ArrowRight, Inbox } from "lucide-react";

export interface PaymentTableProps {
  payments: PaymentAdminResponse[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  isLoading = false,
  emptyMessage = "No payments found.",
}) => {
  if (isLoading && payments.length === 0) {
    return (
      <div
        data-testid="admin-payments-table-loading"
        className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase tracking-wider font-semibold">
              <th className="py-3.5 px-4">Payment ID</th>
              <th className="py-3.5 px-4">Payer Account</th>
              <th className="py-3.5 px-4">Payee Account</th>
              <th className="py-3.5 px-4 text-right">Amount</th>
              <th className="py-3.5 px-4 text-right">Fee</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Provider Ref</th>
              <th className="py-3.5 px-4">Created At</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="py-4 px-4">
                  <div className="h-4 w-32 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-16 bg-zinc-800 rounded ml-auto" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-12 bg-zinc-800 rounded ml-auto" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-6 w-20 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-20 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-6 w-12 bg-zinc-800 rounded ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div
        data-testid="admin-payments-empty-state"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center"
      >
        <div
          className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400 mb-3"
          aria-hidden="true"
        >
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">{emptyMessage}</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          No administrative payment records match the current criteria. Try adjusting or resetting active filters.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm">
      <table
        data-testid="admin-payments-table"
        className="w-full text-left text-xs border-collapse"
      >
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold">
            <th scope="col" className="py-3.5 px-4 font-semibold">Payment ID</th>
            <th scope="col" className="py-3.5 px-4 font-semibold">Payer Account</th>
            <th scope="col" className="py-3.5 px-4 font-semibold">Payee Account</th>
            <th scope="col" className="py-3.5 px-4 text-right font-semibold">Amount</th>
            <th scope="col" className="py-3.5 px-4 text-right font-semibold">Fee</th>
            <th scope="col" className="py-3.5 px-4 font-semibold">Status</th>
            <th scope="col" className="py-3.5 px-4 font-semibold">Provider Ref</th>
            <th scope="col" className="py-3.5 px-4 font-semibold">Created At</th>
            <th scope="col" className="py-3.5 px-4 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {payments.map((payment) => {
            const formattedAmount = formatMoney(payment.amountMinor, payment.currency);
            const formattedFee = formatMoney(payment.feeMinor, payment.currency);
            const formattedDate = formatDateTime(payment.createdAt);

            return (
              <tr
                key={payment.id}
                data-testid={`payment-row-${payment.id}`}
                className="hover:bg-zinc-800/40 transition-colors duration-100"
              >
                {/* Payment ID */}
                <td className="py-3.5 px-4 font-mono font-medium text-indigo-400 hover:text-indigo-300">
                  <Link
                    href={`/admin/payments/${payment.id}`}
                    className="focus:outline-none focus-visible:underline"
                    title={payment.id}
                  >
                    {payment.id.length > 13
                      ? `${payment.id.slice(0, 8)}...${payment.id.slice(-4)}`
                      : payment.id}
                  </Link>
                </td>

                {/* Payer Account */}
                <td className="py-3.5 px-4 font-mono text-zinc-300" title={payment.payerAccountId}>
                  {payment.payerAccountId.slice(0, 8)}...
                </td>

                {/* Payee Account */}
                <td className="py-3.5 px-4 font-mono text-zinc-300" title={payment.payeeAccountId}>
                  {payment.payeeAccountId.slice(0, 8)}...
                </td>

                {/* Amount */}
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                  {formattedAmount}
                </td>

                {/* Fee */}
                <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                  {formattedFee}
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  <PaymentAdminStatusBadge status={payment.status} />
                </td>

                {/* Provider Reference */}
                <td className="py-3.5 px-4 font-mono text-zinc-400 truncate max-w-[140px]" title={payment.providerReference || "None"}>
                  {payment.providerReference || "—"}
                </td>

                {/* Created At */}
                <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                  {formattedDate}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  <Link
                    href={`/admin/payments/${payment.id}`}
                    aria-label={`View details for payment ${payment.id}`}
                    data-testid={`view-payment-link-${payment.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
  );
};
