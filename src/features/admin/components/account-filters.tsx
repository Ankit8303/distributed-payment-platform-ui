"use client";

import React, { useState, useEffect } from "react";
import type { AccountQueryParams } from "@/types/admin";
import type { AccountStatus, AccountType } from "@/types/account";
import { Filter, RotateCcw, AlertCircle, User, ShieldCheck, Tag } from "lucide-react";

export interface AccountFiltersProps {
  initialFilters?: AccountQueryParams;
  onApply: (filters: AccountQueryParams) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export type FilterDimension = "owner" | "status" | "type";

export const ACCOUNT_STATUSES: { label: string; value: AccountStatus }[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Frozen", value: "FROZEN" },
  { label: "Closed", value: "CLOSED" },
];

export const ACCOUNT_TYPES: { label: string; value: AccountType }[] = [
  { label: "Customer", value: "CUSTOMER" },
  { label: "Merchant", value: "MERCHANT" },
  { label: "Internal Settlement", value: "INTERNAL_SETTLEMENT" },
  { label: "Escrow", value: "ESCROW" },
  { label: "Fees", value: "FEES" },
];

export const AccountFilters: React.FC<AccountFiltersProps> = ({
  initialFilters = {},
  onApply,
  onReset,
  isLoading = false,
}) => {
  // Determine initial mode based on verified priority: ownerId > status > accountType
  const initialMode: FilterDimension = initialFilters.ownerId
    ? "owner"
    : initialFilters.status
    ? "status"
    : initialFilters.accountType
    ? "type"
    : "owner";

  const [activeMode, setActiveMode] = useState<FilterDimension>(initialMode);
  const [ownerIdInput, setOwnerIdInput] = useState<string>(initialFilters.ownerId || "");
  const [statusInput, setStatusInput] = useState<string>(initialFilters.status || "");
  const [typeInput, setTypeInput] = useState<string>(initialFilters.accountType || "");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize state when initialFilters change (e.g. from URL navigation)
  useEffect(() => {
    if (initialFilters.ownerId) {
      setActiveMode("owner");
      setOwnerIdInput(initialFilters.ownerId);
      setStatusInput("");
      setTypeInput("");
    } else if (initialFilters.status) {
      setActiveMode("status");
      setStatusInput(initialFilters.status);
      setOwnerIdInput("");
      setTypeInput("");
    } else if (initialFilters.accountType) {
      setActiveMode("type");
      setTypeInput(initialFilters.accountType);
      setOwnerIdInput("");
      setStatusInput("");
    } else {
      setOwnerIdInput("");
      setStatusInput("");
      setTypeInput("");
    }
    setValidationError(null);
  }, [initialFilters.ownerId, initialFilters.status, initialFilters.accountType]);

  const handleModeChange = (mode: FilterDimension) => {
    setActiveMode(mode);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (activeMode === "owner") {
      const trimmed = ownerIdInput.trim();
      if (!trimmed && ownerIdInput.length > 0) {
        setValidationError("Owner ID cannot be whitespace only.");
        return;
      }
      if (!trimmed) {
        // Clearing or empty submission
        onReset();
        return;
      }
      // Apply ONLY ownerId, ensuring no contradictory filter combination
      onApply({ ownerId: trimmed });
    } else if (activeMode === "status") {
      if (!statusInput) {
        onReset();
        return;
      }
      onApply({ status: statusInput as AccountStatus });
    } else if (activeMode === "type") {
      if (!typeInput) {
        onReset();
        return;
      }
      onApply({ accountType: typeInput as AccountType });
    }
  };

  const handleReset = () => {
    setOwnerIdInput("");
    setStatusInput("");
    setTypeInput("");
    setValidationError(null);
    onReset();
  };

  const hasActiveFilter = Boolean(
    initialFilters.ownerId || initialFilters.status || initialFilters.accountType
  );

  return (
    <div
      data-testid="admin-account-filters"
      className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm space-y-4"
    >
      {/* Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Filter Mode
          </span>
          <span className="text-[10px] text-zinc-500 font-normal">
            (Mutually Exclusive)
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Account filter dimensions"
          className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "owner"}
            data-testid="filter-mode-owner"
            onClick={() => handleModeChange("owner")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeMode === "owner"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Owner ID</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "status"}
            data-testid="filter-mode-status"
            onClick={() => handleModeChange("status")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeMode === "status"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Status</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "type"}
            data-testid="filter-mode-type"
            onClick={() => handleModeChange("type")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeMode === "type"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Tag className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Account Type</span>
          </button>
        </div>
      </div>

      {/* Filter Inputs Form */}
      <form
        onSubmit={handleSubmit}
        data-testid="admin-account-filters-form"
        className="space-y-3"
      >
        {activeMode === "owner" && (
          <div className="space-y-1.5">
            <label
              htmlFor="filter-owner-id"
              className="block text-xs font-medium text-zinc-300"
            >
              Owner Identifier (UUID)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="filter-owner-id"
                data-testid="filter-owner-id-input"
                type="text"
                value={ownerIdInput}
                onChange={(e) => {
                  setOwnerIdInput(e.target.value);
                  setValidationError(null);
                }}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  data-testid="account-filters-apply-button"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  Apply Owner Filter
                </button>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleReset}
                    data-testid="account-filters-reset-button"
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
            {validationError && (
              <p
                role="alert"
                data-testid="filter-validation-error"
                className="text-xs text-rose-400 flex items-center gap-1 mt-1"
              >
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{validationError}</span>
              </p>
            )}
          </div>
        )}

        {activeMode === "status" && (
          <div className="space-y-1.5">
            <label
              htmlFor="filter-status-select"
              className="block text-xs font-medium text-zinc-300"
            >
              Account Status
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                id="filter-status-select"
                data-testid="filter-status-select"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">Select Status...</option>
                {ACCOUNT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({s.value})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  data-testid="account-filters-apply-button"
                  disabled={isLoading || !statusInput}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  Apply Status Filter
                </button>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleReset}
                    data-testid="account-filters-reset-button"
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeMode === "type" && (
          <div className="space-y-1.5">
            <label
              htmlFor="filter-type-select"
              className="block text-xs font-medium text-zinc-300"
            >
              Account Type
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                id="filter-type-select"
                data-testid="filter-type-select"
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">Select Account Type...</option>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.value})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  data-testid="account-filters-apply-button"
                  disabled={isLoading || !typeInput}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  Apply Type Filter
                </button>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleReset}
                    data-testid="account-filters-reset-button"
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Backend Priority Clarification */}
        <p className="text-[11px] text-zinc-500 italic">
          Backend Contract: Account filters are mutually exclusive. The backend evaluates filters in priority order: Owner ID &gt; Status &gt; Account Type.
        </p>
      </form>
    </div>
  );
};
