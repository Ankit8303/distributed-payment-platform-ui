"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminPayouts } from "@/lib/api/endpoints/admin-api";
import type { Page, PayoutAdminResponse, PayoutQueryParams } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminPayoutsOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

export function normalizePayoutQueryParams(
  params?: PayoutQueryParams
): PayoutQueryParams | undefined {
  if (!params) return undefined;
  const { page, size, sort, accountId, status } = params;
  const normalized: PayoutQueryParams = {};

  if (page !== undefined) normalized.page = page;
  if (size !== undefined) normalized.size = size;
  if (sort !== undefined) normalized.sort = sort;
  if (accountId && accountId.trim()) normalized.accountId = accountId.trim();
  if (status) normalized.status = status;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function useAdminPayouts(
  params?: PayoutQueryParams,
  options?: UseAdminPayoutsOptions
) {
  const normalizedParams = normalizePayoutQueryParams(params);

  return useQuery<Page<PayoutAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.payouts(normalizedParams),
    queryFn: () => getAdminPayouts(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    retry: options?.retry ?? 1,
  });
}
