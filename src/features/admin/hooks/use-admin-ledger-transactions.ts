"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminLedgerTransactions } from "@/lib/api/endpoints/admin-api";
import type { LedgerQueryParams, LedgerTransactionAdminResponse, Page } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminLedgerTransactionsOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-F Admin Ledger Transactions List Query Hook
 * Fetches paginated double-entry ledger transactions from GET /api/v1/admin/ledger/transactions.
 */
export function useAdminLedgerTransactions(
  params?: LedgerQueryParams,
  options?: UseAdminLedgerTransactionsOptions
) {
  return useQuery<Page<LedgerTransactionAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.ledgerTransactions(params),
    queryFn: ({ signal }) => getAdminLedgerTransactions(params, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
