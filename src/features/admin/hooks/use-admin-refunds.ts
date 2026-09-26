"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminRefunds } from "@/lib/api/endpoints/admin-api";
import type { Page, RefundAdminResponse, RefundQueryParams } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminRefundsOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

export function normalizeRefundQueryParams(
  params?: RefundQueryParams
): RefundQueryParams | undefined {
  if (!params) return undefined;
  const { page, size, sort, paymentId, status } = params;
  const normalized: RefundQueryParams = {};

  if (page !== undefined) normalized.page = page;
  if (size !== undefined) normalized.size = size;
  if (sort !== undefined) normalized.sort = sort;
  if (paymentId && paymentId.trim()) normalized.paymentId = paymentId.trim();
  if (status) normalized.status = status;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function useAdminRefunds(
  params?: RefundQueryParams,
  options?: UseAdminRefundsOptions
) {
  const normalizedParams = normalizeRefundQueryParams(params);

  return useQuery<Page<RefundAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.refunds(normalizedParams),
    queryFn: () => getAdminRefunds(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    retry: options?.retry ?? 1,
  });
}
