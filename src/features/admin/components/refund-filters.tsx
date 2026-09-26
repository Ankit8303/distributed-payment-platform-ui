"use client";

import React, { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import type { RefundQueryParams, RefundStatus } from "@/types/admin";

export interface RefundFiltersProps {
  initialFilters: RefundQueryParams;
  onApplyFilters: (filters: RefundQueryParams) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS: { label: string; value: RefundStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  { label: "Settled", value: "SETTLED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Requested", value: "REQUESTED" },
  { label: "Pending Reconciliation", value: "PENDING_RECONCILIATION" },
  { label: "Failed", value: "FAILED" },
];

export function RefundFilters({
  initialFilters,
  onApplyFilters,
  onResetFilters,
  isLoading = false,
}: RefundFiltersProps) {
  const [paymentId, setPaymentId] = useState<string>(initialFilters.paymentId || "");
  const [status, setStatus] = useState<RefundStatus | "">(initialFilters.status || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: RefundQueryParams = {
      page: 0,
      size: initialFilters.size || 20,
      sort: initialFilters.sort || "createdAt,desc",
      ...(paymentId.trim() ? { paymentId: paymentId.trim() } : {}),
      ...(status ? { status } : {}),
    };
    onApplyFilters(filters);
  };

  const handleReset = () => {
    setPaymentId("");
    setStatus("");
    onResetFilters();
  };

  const hasActiveFilters = Boolean(paymentId.trim() || status);

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="refund-filters"
      className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
          <span>Refund Filters</span>
        </div>
        {hasActiveFilters && (
          <span className="text-xs text-indigo-400 font-medium">
            Active filters applied
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Payment ID Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="refund-payment-id-input"
            className="block text-xs font-medium text-zinc-400"
          >
            Payment ID
          </label>
          <input
            id="refund-payment-id-input"
            data-testid="refund-payment-id-filter"
            type="text"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            placeholder="Search payment UUID..."
            disabled={isLoading}
            className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="refund-status-select"
            className="block text-xs font-medium text-zinc-400"
          >
            Refund Status
          </label>
          <select
            id="refund-status-select"
            data-testid="refund-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as RefundStatus | "")}
            disabled={isLoading}
            className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading || !hasActiveFilters}
          data-testid="refund-reset-filters-button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Filters</span>
        </button>

        <button
          type="submit"
          disabled={isLoading}
          data-testid="refund-apply-filters-button"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Apply Filters</span>
        </button>
      </div>
    </form>
  );
}
