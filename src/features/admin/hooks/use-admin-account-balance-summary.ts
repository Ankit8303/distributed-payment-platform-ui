"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminAccountBalanceSummary } from "@/lib/api/endpoints/admin-api";
import type { AccountBalanceSummaryResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminAccountBalanceSummaryOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-G-A Admin Account Balance Summary & Consistency Query Hook
 * Fetches authoritative dual-balance comparison from GET /api/v1/admin/accounts/{id}/balance-summary.
 *
 * CRITICAL FINANCIAL INVARIANT:
 * Zero client-side arithmetic. All balance figures (materializedBalanceMinor,
 * authoritativeLedgerBalanceMinor, differenceMinor, isConsistent) are computed
 * exclusively by backend double-entry auditing services and consumed as read-only data.
 */
export function useAdminAccountBalanceSummary(
  accountId: string | undefined,
  options?: UseAdminAccountBalanceSummaryOptions
) {
  const normalizedId = accountId?.trim();

  return useQuery<AccountBalanceSummaryResponse, ApiError | Error>({
    queryKey: adminKeys.balanceSummary(normalizedId || ""),
    queryFn: ({ signal }) => getAdminAccountBalanceSummary(normalizedId!, { signal }),
    enabled: Boolean(normalizedId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
