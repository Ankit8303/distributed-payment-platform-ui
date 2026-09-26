"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaymentPaginationProps {
  page: number; // 0-indexed
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (newPage: number) => void;
  onSizeChange?: (newSize: number) => void;
  isLoading?: boolean;
}

export const PaymentPagination: React.FC<PaymentPaginationProps> = ({
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
      data-testid="admin-payment-pagination"
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
          payments
        </span>

        {onSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <label htmlFor="pagination-page-size" className="text-zinc-400">
              Per page:
            </label>
            <select
              id="pagination-page-size"
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              disabled={isLoading}
              data-testid="pagination-size-select"
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
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
        <span className="mr-2">
          Page <span className="font-semibold text-zinc-200">{page + 1}</span> of{" "}
          <span className="font-semibold text-zinc-200">
            {Math.max(totalPages, 1)}
          </span>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isFirst || isLoading}
          aria-label="Previous page"
          data-testid="pagination-prev-button"
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLast || isLoading}
          aria-label="Next page"
          data-testid="pagination-next-button"
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};
