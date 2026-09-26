"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminPayment } from "@/lib/api/endpoints/admin-api";
import type { PaymentAdminResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminPaymentOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-D Admin Payment Detail Query Hook
 * Fetches authoritative payment record from GET /api/v1/admin/payments/{id}.
 */
export function useAdminPayment(
  paymentId: string | undefined,
  options?: UseAdminPaymentOptions
) {
  const normalizedId = paymentId?.trim();

  return useQuery<PaymentAdminResponse, ApiError | Error>({
    queryKey: adminKeys.payment(normalizedId || ""),
    queryFn: ({ signal }) => getAdminPayment(normalizedId!, { signal }),
    enabled: Boolean(normalizedId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
