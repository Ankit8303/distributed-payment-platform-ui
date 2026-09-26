"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface LedgerPaginationProps {
  page: number; // 0-indexed
  totalPages: number;
  totalElements: number;
  size: number;
  itemLabel?: string;
  onPageChange: (newPage: number) => void;
  onSizeChange?: (newSize: number) => void;
  isLoading?: boolean;
}

export const LedgerPagination: React.FC<LedgerPaginationProps> = ({
  page,
  totalPages,
  totalElements,
  size,
  itemLabel = "records",
  onPageChange,
  onSizeChange,
  isLoading = false,
}) => {
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1 || totalPages === 0;

  const startItem = totalElements === 0 ? 0 : page * size + 1;
  const endItem = Math.min((page + 1) * size, totalElements);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      data-testid="admin-ledger-pagination"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3 px-4 border-t border-zinc-800 text-xs text-zinc-400"
    >
      <div className="flex items-center gap-4">
        <span>
          Showing{" "}
          <span className="font-semibold text-zinc-200">
            {startItem.toLocaleString()}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-zinc-200">
            {endItem.toLocaleString()}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-zinc-200">
            {totalElements.toLocaleString()}
          </span>{" "}
          {itemLabel}
        </span>

        {onSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <label htmlFor="ledger-pagination-page-size" className="text-zinc-400">
              Per page:
            </label>
            <select
              id="ledger-pagination-page-size"
              data-testid="ledger-pagination-page-size"
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:opacity-50"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isFirst || isLoading}
          aria-label="Previous page"
          data-testid="ledger-pagination-prev"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed min-h-[34px]"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>Previous</span>
        </button>

        <span className="px-2 text-zinc-400 font-mono text-[11px]">
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLast || isLoading}
          aria-label="Next page"
          data-testid="ledger-pagination-next"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed min-h-[34px]"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};
