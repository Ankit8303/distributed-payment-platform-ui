"use client";

import React from "react";
import Link from "next/link";
import type { AccountAdminResponse } from "@/types/admin";
import { AccountAdminStatusBadge } from "./account-status-badge";
import { formatMinorUnits } from "@/lib/formatting/money";
import { formatDateTime } from "@/lib/formatting/date";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Inbox,
  RotateCcw,
} from "lucide-react";

export interface AccountTableProps {
  accounts: AccountAdminResponse[];
  isLoading?: boolean;
  sort?: string;
  onSortChange?: (newSort: string) => void;
  emptyMessage?: string;
  hasActiveFilter?: boolean;
  onClearFilter?: () => void;
}

const VERIFIED_SORT_FIELDS: Record<string, string> = {
  accountNumber: "accountNumber",
  accountType: "accountType",
  status: "status",
  materializedBalanceMinor: "materializedBalanceMinor",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  isLoading = false,
  sort = "createdAt,desc",
  onSortChange,
  emptyMessage = "No accounts found.",
  hasActiveFilter = false,
  onClearFilter,
}) => {
  const [currentField, currentDir] = sort.split(",");

  const handleHeaderClick = (field: string) => {
    if (!onSortChange || !VERIFIED_SORT_FIELDS[field]) return;

    if (currentField === field) {
      const nextDir = currentDir === "desc" ? "asc" : "desc";
      onSortChange(`${field},${nextDir}`);
    } else {
      onSortChange(`${field},desc`);
    }
  };

  const getSortIcon = (field: string) => {
    if (!VERIFIED_SORT_FIELDS[field]) return null;
    if (currentField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 opacity-60 group-hover:opacity-100" aria-hidden="true" />;
    }
    return currentDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
    );
  };

  const getAriaSort = (field: string): "ascending" | "descending" | "none" => {
    if (currentField !== field) return "none";
    return currentDir === "asc" ? "ascending" : "descending";
  };

  // Loading Skeleton State
  if (isLoading && accounts.length === 0) {
    return (
      <div
        data-testid="admin-accounts-table-loading"
        className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase tracking-wider font-semibold">
              <th className="py-3.5 px-4">Account Number</th>
              <th className="py-3.5 px-4">Owner ID</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Currency</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Materialized Balance</th>
              <th className="py-3.5 px-4">Created</th>
              <th className="py-3.5 px-4">Updated</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="py-4 px-4">
                  <div className="h-4 w-32 bg-zinc-800 rounded mb-1" />
                  <div className="h-3 w-20 bg-zinc-850 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-28 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-5 w-20 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-12 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-6 w-18 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-24 bg-zinc-800 rounded ml-auto" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                </td>
                <td className="py-4 px-4">
                  <div className="h-6 w-16 bg-zinc-800 rounded ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty State (Distinguishes between filtered empty vs overall empty)
  if (accounts.length === 0) {
    if (hasActiveFilter) {
      return (
        <div
          data-testid="admin-accounts-filtered-empty"
          className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-xl shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mb-3">
            <Inbox className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            No accounts match the active filter
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            No account records found for the applied filter dimension. Try adjusting or clearing your criteria.
          </p>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              data-testid="empty-clear-filter-button"
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        data-testid="admin-accounts-empty"
        className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-xl shadow-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mb-3">
          <Inbox className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">{emptyMessage}</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          No accounts have been registered on the platform ledger yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
      <div className="overflow-x-auto">
        <table
          data-testid="admin-accounts-table"
          className="w-full text-left text-xs border-collapse"
        >
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[11px]">
              {/* Account Number */}
              <th
                scope="col"
                aria-sort={getAriaSort("accountNumber")}
                className="py-3.5 px-4 font-semibold"
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("accountNumber")}
                  className="group inline-flex items-center gap-1.5 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
                >
                  <span>Account Number</span>
                  {getSortIcon("accountNumber")}
                </button>
              </th>

              {/* Owner ID */}
              <th scope="col" className="py-3.5 px-4 font-semibold">
                Owner ID
              </th>

              {/* Account Type */}
              <th
                scope="col"
                aria-sort={getAriaSort("accountType")}
                className="py-3.5 px-4 font-semibold"
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("accountType")}
                  className="group inline-flex items-center gap-1.5 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
                >
                  <span>Type</span>
                  {getSortIcon("accountType")}
                </button>
              </th>

              {/* Currency */}
              <th scope="col" className="py-3.5 px-4 font-semibold">
                Currency
              </th>

              {/* Status */}
              <th
                scope="col"
                aria-sort={getAriaSort("status")}
                className="py-3.5 px-4 font-semibold"
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("status")}
                  className="group inline-flex items-center gap-1.5 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
                >
                  <span>Status</span>
                  {getSortIcon("status")}
                </button>
              </th>

              {/* Materialized Balance */}
              <th
                scope="col"
                aria-sort={getAriaSort("materializedBalanceMinor")}
                className="py-3.5 px-4 text-right font-semibold"
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("materializedBalanceMinor")}
                  className="group inline-flex items-center gap-1.5 hover:text-zinc-200 transition-colors ml-auto focus:outline-none focus-visible:underline"
                >
                  <span>Materialized Balance</span>
                  {getSortIcon("materializedBalanceMinor")}
                </button>
              </th>

              {/* Created At */}
              <th
                scope="col"
                aria-sort={getAriaSort("createdAt")}
                className="py-3.5 px-4 font-semibold"
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("createdAt")}
                  className="group inline-flex items-center gap-1.5 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
                >
                  <span>Created</span>
                  {getSortIcon("createdAt")}
                </button>
              </th>

              {/* Updated At */}
              <th
                scope="col"
                aria-sort={getAriaSort("updatedAt")}
                className="py-3.5 px-4 font-semibold"
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("updatedAt")}
                  className="group inline-flex items-center gap-1.5 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
                >
                  <span>Updated</span>
                  {getSortIcon("updatedAt")}
                </button>
              </th>

              {/* Actions */}
              <th scope="col" className="py-3.5 px-4 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/60">
            {accounts.map((account) => {
              const formattedBalance = formatMinorUnits(
                account.materializedBalanceMinor,
                account.currency
              );
              const formattedCreated = formatDateTime(account.createdAt);
              const formattedUpdated = formatDateTime(account.updatedAt);

              return (
                <tr
                  key={account.id}
                  data-testid={`account-row-${account.id}`}
                  className="hover:bg-zinc-800/40 transition-colors duration-100"
                >
                  {/* Account Number & ID */}
                  <td className="py-3.5 px-4 font-medium text-zinc-100">
                    <div className="font-semibold text-zinc-200">
                      {account.accountNumber}
                    </div>
                    <div
                      className="font-mono text-[10px] text-zinc-500 truncate max-w-[120px]"
                      title={account.id}
                    >
                      {account.id}
                    </div>
                  </td>

                  {/* Owner ID */}
                  <td
                    className="py-3.5 px-4 font-mono text-[11px] text-zinc-400 truncate max-w-[140px]"
                    title={account.ownerId}
                  >
                    {account.ownerId.length > 16
                      ? `${account.ownerId.slice(0, 8)}...${account.ownerId.slice(-4)}`
                      : account.ownerId}
                  </td>

                  {/* Account Type */}
                  <td className="py-3.5 px-4 text-zinc-300">
                    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {account.accountType}
                    </span>
                  </td>

                  {/* Currency */}
                  <td className="py-3.5 px-4 font-mono font-medium text-zinc-300">
                    {account.currency}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <AccountAdminStatusBadge status={account.status} />
                  </td>

                  {/* Materialized Balance */}
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-white whitespace-nowrap">
                    {formattedBalance}
                  </td>

                  {/* Created At */}
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                    {formattedCreated}
                  </td>

                  {/* Updated At */}
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                    {formattedUpdated}
                  </td>

                  {/* Action Link to Detail Inspector */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/accounts/${account.id}`}
                      data-testid={`inspect-account-${account.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 border border-indigo-900/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                    >
                      <span data-testid={`inspect-account-link-${account.id}`}>Inspect</span>
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
