"use client";

import React, { useState } from "react";
import type { LedgerQueryParams } from "@/types/admin";
import { Filter, RotateCcw } from "lucide-react";

export interface LedgerFiltersProps {
  initialFilters?: LedgerQueryParams;
  onApply: (filters: LedgerQueryParams) => void;
  onReset: () => void;
  isLoading?: boolean;
}

const SOURCE_REFERENCE_TYPES: { label: string; value: string }[] = [
  { label: "Payment", value: "PAYMENT" },
  { label: "Refund", value: "REFUND" },
  { label: "Payout", value: "PAYOUT" },
  { label: "System Adjustment", value: "SYSTEM_ADJUSTMENT" },
  { label: "Reversal", value: "REVERSAL" },
];

export const LedgerFilters: React.FC<LedgerFiltersProps> = ({
  initialFilters = {},
  onApply,
  onReset,
  isLoading = false,
}) => {
  const [sourceReferenceType, setSourceReferenceType] = useState<string>(
    initialFilters.sourceReferenceType || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      ...(sourceReferenceType.trim() ? { sourceReferenceType: sourceReferenceType.trim() } : {}),
    });
  };

  const handleReset = () => {
    setSourceReferenceType("");
    onReset();
  };

  const hasActiveFilters = Boolean(sourceReferenceType.trim());

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="admin-ledger-filters-form"
      aria-label="Ledger Filters"
      className="p-4 sm:p-5 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Filter className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <span>Filter Ledger Transactions</span>
        </div>
        {hasActiveFilters && (
          <span className="text-[11px] font-medium text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
            Filtered
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Source Reference Type filter (The only filter verified by AdminLedgerController) */}
        <div className="space-y-1.5">
          <label
            htmlFor="filter-source-reference-type"
            className="block text-xs font-medium text-zinc-400"
          >
            Source Reference Type
          </label>
          <select
            id="filter-source-reference-type"
            data-testid="filter-source-type-select"
            value={sourceReferenceType}
            onChange={(e) => setSourceReferenceType(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-colors disabled:opacity-50 min-h-[38px]"
          >
            <option value="">All Source Types</option>
            {SOURCE_REFERENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.value})
              </option>
            ))}
          </select>
        </div>

        {/* Empty column for grid alignment */}
        <div className="hidden sm:block" />

        {/* Action Buttons */}
        <div className="flex items-end justify-end gap-2 pt-2 sm:pt-0">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              data-testid="filter-reset-button"
              aria-label="Reset filters"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 min-h-[38px]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            data-testid="filter-apply-button"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/80 rounded-lg shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 min-h-[38px]"
          >
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </form>
  );
};
