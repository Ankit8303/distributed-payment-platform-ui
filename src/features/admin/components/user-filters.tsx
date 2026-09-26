"use client";

import React, { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import type { UserQueryParams, UserRole, UserStatus } from "@/types/admin";

export interface UserFiltersProps {
  initialFilters: UserQueryParams;
  onApplyFilters: (filters: UserQueryParams) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

const ROLE_OPTIONS: { label: string; value: UserRole | "" }[] = [
  { label: "All Roles", value: "" },
  { label: "Admin", value: "ADMIN" },
  { label: "System", value: "SYSTEM" },
  { label: "Merchant", value: "MERCHANT" },
  { label: "Customer", value: "CUSTOMER" },
];

const STATUS_OPTIONS: { label: string; value: UserStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Locked", value: "LOCKED" },
  { label: "Deleted", value: "DELETED" },
];

export function UserFilters({
  initialFilters,
  onApplyFilters,
  onResetFilters,
  isLoading = false,
}: UserFiltersProps) {
  const [role, setRole] = useState<UserRole | "">(initialFilters.role || "");
  const [status, setStatus] = useState<UserStatus | "">(initialFilters.status || "");
  const [email, setEmail] = useState<string>(initialFilters.email || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: UserQueryParams = {
      page: 0,
      size: initialFilters.size || 20,
      sort: initialFilters.sort || "createdAt,desc",
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
    };
    onApplyFilters(filters);
  };

  const handleReset = () => {
    setRole("");
    setStatus("");
    setEmail("");
    onResetFilters();
  };

  const hasActiveFilters = Boolean(role || status || email.trim());

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="user-filters"
      className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
          <span>User Filters</span>
        </div>
        {hasActiveFilters && (
          <span className="text-xs text-indigo-400 font-medium">
            Active filters applied
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Role Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="user-role-select"
            className="block text-xs font-medium text-zinc-400"
          >
            Role
          </label>
          <select
            id="user-role-select"
            data-testid="user-role-filter"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole | "")}
            disabled={isLoading}
            className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="user-status-select"
            className="block text-xs font-medium text-zinc-400"
          >
            Status
          </label>
          <select
            id="user-status-select"
            data-testid="user-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus | "")}
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

        {/* Email Search Filter */}
        <div className="space-y-1.5">
          <label
            htmlFor="user-email-input"
            className="block text-xs font-medium text-zinc-400"
          >
            Email Query
          </label>
          <input
            id="user-email-input"
            data-testid="user-email-filter"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Search email..."
            disabled={isLoading}
            className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading || !hasActiveFilters}
          data-testid="user-reset-filters-button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Filters</span>
        </button>

        <button
          type="submit"
          disabled={isLoading}
          data-testid="user-apply-filters-button"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Apply Filters</span>
        </button>
      </div>
    </form>
  );
}
