"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminLedgerTransaction } from "@/lib/api/endpoints/admin-api";
import type { LedgerTransactionAdminResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminLedgerTransactionOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-F Admin Ledger Transaction Detail Query Hook
 * Fetches authoritative single ledger transaction from GET /api/v1/admin/ledger/transactions/{id}.
 */
export function useAdminLedgerTransaction(
  transactionId: string | undefined,
  options?: UseAdminLedgerTransactionOptions
) {
  const normalizedId = transactionId?.trim();

  return useQuery<LedgerTransactionAdminResponse, ApiError | Error>({
    queryKey: adminKeys.ledgerTransaction(normalizedId || ""),
    queryFn: ({ signal }) => getAdminLedgerTransaction(normalizedId!, { signal }),
    enabled: Boolean(normalizedId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
