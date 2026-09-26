"use client";

import React, { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import type { NotificationQueryParams, NotificationStatus } from "@/types/admin";

export interface NotificationFiltersProps {
  initialFilters: NotificationQueryParams;
  onApplyFilters: (filters: NotificationQueryParams) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS: { label: string; value: NotificationStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  { label: "Sent", value: "SENT" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Failed", value: "FAILED" },
  { label: "Exhausted", value: "EXHAUSTED" },
];

export function NotificationFilters({
  initialFilters,
  onApplyFilters,
  onResetFilters,
  isLoading = false,
}: NotificationFiltersProps) {
  const [status, setStatus] = useState<NotificationStatus | "">(
    initialFilters.status || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: NotificationQueryParams = {
      page: 0,
      size: initialFilters.size || 20,
      sort: initialFilters.sort || "createdAt,desc",
      ...(status ? { status } : {}),
    };
    onApplyFilters(filters);
  };

  const handleReset = () => {
    setStatus("");
    onResetFilters();
  };

  const hasActiveFilters = Boolean(status);

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="notification-filters"
      className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
          <span>Notification Filters</span>
        </div>
        {hasActiveFilters && (
          <span className="text-xs text-indigo-400 font-medium">
            Active filters applied
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="notification-status-select"
            className="block text-xs font-medium text-zinc-400"
          >
            Delivery Status
          </label>
          <select
            id="notification-status-select"
            data-testid="notification-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as NotificationStatus | "")}
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
          data-testid="notification-reset-filters-button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Filters</span>
        </button>

        <button
          type="submit"
          disabled={isLoading}
          data-testid="notification-apply-filters-button"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Apply Filters</span>
        </button>
      </div>
    </form>
  );
}
