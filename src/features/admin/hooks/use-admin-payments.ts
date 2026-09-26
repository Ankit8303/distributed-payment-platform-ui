"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminPayments } from "@/lib/api/endpoints/admin-api";
import type { Page, PaymentAdminResponse, PaymentQueryParams } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminPaymentsOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-D Admin Payments Query Hook
 * Fetches paginated, filtered payments from GET /api/v1/admin/payments.
 */
export function useAdminPayments(
  params?: PaymentQueryParams,
  options?: UseAdminPaymentsOptions
) {
  return useQuery<Page<PaymentAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.payments(params),
    queryFn: ({ signal }) => getAdminPayments(params, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
