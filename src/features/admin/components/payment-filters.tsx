"use client";

import React, { useState } from "react";
import type { PaymentStatus, PaymentQueryParams } from "@/types/admin";
import { Filter, RotateCcw } from "lucide-react";

export interface PaymentFiltersProps {
  initialFilters?: PaymentQueryParams;
  onApply: (filters: PaymentQueryParams) => void;
  onReset: () => void;
  isLoading?: boolean;
}

const PAYMENT_STATUSES: { label: string; value: PaymentStatus }[] = [
  { label: "Settled", value: "SETTLED" },
  { label: "Pending Reconciliation", value: "PENDING_RECONCILIATION" },
  { label: "Failed", value: "FAILED" },
  { label: "Declined", value: "DECLINED" },
  { label: "Authorized", value: "AUTHORIZED" },
  { label: "Authorizing", value: "AUTHORIZING" },
  { label: "Capturing", value: "CAPTURING" },
  { label: "Created", value: "CREATED" },
  { label: "Expired", value: "EXPIRED" },
];

export const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  initialFilters = {},
  onApply,
  onReset,
  isLoading = false,
}) => {
  const [status, setStatus] = useState<string>(initialFilters.status || "");
  const [payerAccountId, setPayerAccountId] = useState<string>(
    initialFilters.payerAccountId || ""
  );
  const [payeeAccountId, setPayeeAccountId] = useState<string>(
    initialFilters.payeeAccountId || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      ...(status ? { status: status as PaymentStatus } : {}),
      ...(payerAccountId.trim() ? { payerAccountId: payerAccountId.trim() } : {}),
      ...(payeeAccountId.trim() ? { payeeAccountId: payeeAccountId.trim() } : {}),
    });
  };

  const handleReset = () => {
    setStatus("");
    setPayerAccountId("");
    setPayeeAccountId("");
    onReset();
  };

  const hasActiveFilters = Boolean(status || payerAccountId.trim() || payeeAccountId.trim());

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="admin-payment-filters-form"
      aria-label="Payment Filters"
      className="p-4 sm:p-5 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Filter className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <span>Filter Payments</span>
        </div>
        {hasActiveFilters && (
          <span className="text-xs text-amber-400 font-medium">Filters active</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="filter-payment-status"
            className="block text-xs font-medium text-zinc-400"
          >
            Payment Status
          </label>
          <select
            id="filter-payment-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isLoading}
            data-testid="filter-status-select"
            className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-colors disabled:opacity-50"
          >
            <option value="">All Statuses</option>
            {PAYMENT_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} ({item.value})
              </option>
            ))}
          </select>
        </div>

        {/* Payer Account ID Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="filter-payer-account-id"
            className="block text-xs font-medium text-zinc-400"
          >
            Payer Account ID
          </label>
          <input
            id="filter-payer-account-id"
            type="text"
            placeholder="UUID (e.g. 123e4567-...)"
            value={payerAccountId}
            onChange={(e) => setPayerAccountId(e.target.value)}
            disabled={isLoading}
            data-testid="filter-payer-input"
            className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-colors disabled:opacity-50"
          />
        </div>

        {/* Payee Account ID Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="filter-payee-account-id"
            className="block text-xs font-medium text-zinc-400"
          >
            Payee Account ID
          </label>
          <input
            id="filter-payee-account-id"
            type="text"
            placeholder="UUID (e.g. 123e4567-...)"
            value={payeeAccountId}
            onChange={(e) => setPayeeAccountId(e.target.value)}
            disabled={isLoading}
            data-testid="filter-payee-input"
            className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-colors disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading || !hasActiveFilters}
          data-testid="filter-reset-button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Filters</span>
        </button>

        <button
          type="submit"
          disabled={isLoading}
          data-testid="filter-apply-button"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Apply Filters</span>
        </button>
      </div>
    </form>
  );
};
