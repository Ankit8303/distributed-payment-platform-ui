"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminAccountLedgerEntries } from "@/lib/api/endpoints/admin-api";
import type { PageableParams, LedgerEntryAdminResponse, Page } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminAccountLedgerEntriesOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-F Admin Account Ledger Entries Query Hook
 * Fetches paginated ledger entry legs for a specific account from GET /api/v1/admin/ledger/accounts/{accountId}/entries.
 */
export function useAdminAccountLedgerEntries(
  accountId: string | undefined,
  params?: PageableParams,
  options?: UseAdminAccountLedgerEntriesOptions
) {
  const normalizedId = accountId?.trim();

  return useQuery<Page<LedgerEntryAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.accountEntries(normalizedId || "", params),
    queryFn: ({ signal }) => getAdminAccountLedgerEntries(normalizedId!, params, { signal }),
    enabled: Boolean(normalizedId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
