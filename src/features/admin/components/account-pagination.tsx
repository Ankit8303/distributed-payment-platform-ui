"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface AccountPaginationProps {
  page: number; // 0-indexed
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (newPage: number) => void;
  onSizeChange?: (newSize: number) => void;
  isLoading?: boolean;
}

export const AccountPagination: React.FC<AccountPaginationProps> = ({
  page,
  totalPages,
  totalElements,
  size,
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
      data-testid="admin-account-pagination"
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
          accounts
        </span>

        {onSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <label htmlFor="account-pagination-page-size" className="text-zinc-400">
              Per page:
            </label>
            <select
              id="account-pagination-page-size"
              data-testid="pagination-size-select"
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <span className="text-zinc-500 mr-2">
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isFirst || isLoading}
          aria-label="Previous page"
          data-testid="pagination-previous-button"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Prev</span>
        </button>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLast || isLoading}
          aria-label="Next page"
          data-testid="pagination-next-button"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};
