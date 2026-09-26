"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminAccounts } from "@/lib/api/endpoints/admin-api";
import type { Page, AccountAdminResponse, AccountQueryParams } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminAccountsOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Normalizes query parameters according to the verified backend priority ladder:
 * 1. ownerId (Priority 1)
 * 2. status (Priority 2)
 * 3. accountType (Priority 3)
 *
 * The backend does not perform multi-predicate AND queries across these fields.
 * Supplying conflicting filters drops lower-priority filters to match backend contract.
 */
export function normalizeAccountQueryParams(
  params?: AccountQueryParams
): AccountQueryParams | undefined {
  if (!params) return undefined;

  const { page, size, sort, ownerId, status, accountType } = params;
  const normalized: AccountQueryParams = {};

  if (page !== undefined) normalized.page = page;
  if (size !== undefined) normalized.size = size;
  if (sort !== undefined) normalized.sort = sort;

  const trimmedOwnerId = ownerId?.trim();
  if (trimmedOwnerId) {
    normalized.ownerId = trimmedOwnerId;
    return normalized;
  }

  if (status) {
    normalized.status = status;
    return normalized;
  }

  if (accountType) {
    normalized.accountType = accountType;
    return normalized;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Phase F7-G-A Admin Accounts Directory Query Hook
 * Fetches paginated accounts from GET /api/v1/admin/accounts.
 * Adheres strictly to backend priority filter ladder.
 */
export function useAdminAccounts(
  params?: AccountQueryParams,
  options?: UseAdminAccountsOptions
) {
  const normalizedParams = normalizeAccountQueryParams(params);

  return useQuery<Page<AccountAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.accounts(normalizedParams),
    queryFn: ({ signal }) => getAdminAccounts(normalizedParams, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
