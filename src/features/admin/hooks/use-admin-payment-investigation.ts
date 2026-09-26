"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminPaymentInvestigation } from "@/lib/api/endpoints/admin-api";
import type { PaymentInvestigationTraceResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminPaymentInvestigationOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-E Admin Payment Investigation Query Hook
 * Fetches authoritative end-to-end distributed trace from GET /api/v1/admin/investigations/payments/{paymentId}.
 */
export function useAdminPaymentInvestigation(
  paymentId: string | undefined,
  options?: UseAdminPaymentInvestigationOptions
) {
  const normalizedId = paymentId?.trim();

  return useQuery<PaymentInvestigationTraceResponse, ApiError | Error>({
    queryKey: adminKeys.investigation(normalizedId || ""),
    queryFn: ({ signal }) => getAdminPaymentInvestigation(normalizedId!, { signal }),
    enabled: Boolean(normalizedId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
