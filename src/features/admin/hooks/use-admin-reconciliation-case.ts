"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminReconciliationCase } from "@/lib/api/endpoints/admin-api";
import type { ReconciliationCaseDetailResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminReconciliationCaseOptions {
  enabled?: boolean;
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F8-C Admin Reconciliation Case Inspector Hook
 * Fetches single case detail from GET /api/v1/admin/reconciliation/cases/{id}.
 */
export function useAdminReconciliationCase(
  caseId: string,
  options?: UseAdminReconciliationCaseOptions
) {
  const normalizedId = caseId?.trim() ?? "";

  return useQuery<ReconciliationCaseDetailResponse, ApiError | Error>({
    queryKey: adminKeys.reconciliationCase(normalizedId),
    queryFn: () => getAdminReconciliationCase(normalizedId),
    enabled: Boolean(normalizedId) && (options?.enabled ?? true),
    staleTime: 15 * 1000,
    retry: options?.retry ?? 1,
  });
}
