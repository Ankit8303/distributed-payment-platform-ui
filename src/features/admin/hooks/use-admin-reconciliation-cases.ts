"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminReconciliationCases } from "@/lib/api/endpoints/admin-api";
import type {
  Page,
  ReconciliationCaseAdminResponse,
  ReconciliationQueryParams,
} from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminReconciliationCasesOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Normalizes query parameters according to the backend reconciliation contract.
 */
export function normalizeReconciliationQueryParams(
  params?: ReconciliationQueryParams
): ReconciliationQueryParams | undefined {
  if (!params) return undefined;

  const { page, size, sort, status } = params;
  const normalized: ReconciliationQueryParams = {};

  if (page !== undefined) normalized.page = page;
  if (size !== undefined) normalized.size = size;
  if (sort !== undefined) normalized.sort = sort;
  if (status) normalized.status = status;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Phase F8-C Admin Reconciliation Cases Directory Query Hook
 * Fetches paginated reconciliation cases from GET /api/v1/admin/reconciliation/cases.
 */
export function useAdminReconciliationCases(
  params?: ReconciliationQueryParams,
  options?: UseAdminReconciliationCasesOptions
) {
  const normalizedParams = normalizeReconciliationQueryParams(params);

  return useQuery<Page<ReconciliationCaseAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.reconciliationCases(normalizedParams),
    queryFn: () => getAdminReconciliationCases(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000, // 15 seconds cache freshness
    retry: options?.retry ?? 1,
  });
}
