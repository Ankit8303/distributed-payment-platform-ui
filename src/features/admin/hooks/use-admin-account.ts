"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminAccount } from "@/lib/api/endpoints/admin-api";
import type { AccountAdminResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminAccountOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-G-A Admin Account Detail Query Hook
 * Fetches single account record from GET /api/v1/admin/accounts/{id}.
 */
export function useAdminAccount(
  accountId: string | undefined,
  options?: UseAdminAccountOptions
) {
  const normalizedId = accountId?.trim();

  return useQuery<AccountAdminResponse, ApiError | Error>({
    queryKey: adminKeys.account(normalizedId || ""),
    queryFn: ({ signal }) => getAdminAccount(normalizedId!, { signal }),
    enabled: Boolean(normalizedId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
