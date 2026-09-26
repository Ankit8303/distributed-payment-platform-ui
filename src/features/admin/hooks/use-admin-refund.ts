"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminRefund } from "@/lib/api/endpoints/admin-api";
import type { RefundAdminResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export function useAdminRefund(refundId: string) {
  const normalizedId = refundId?.trim();

  return useQuery<RefundAdminResponse, ApiError | Error>({
    queryKey: adminKeys.refund(normalizedId),
    queryFn: () => getAdminRefund(normalizedId),
    enabled: Boolean(normalizedId),
    staleTime: 30 * 1000,
    retry: 1,
  });
}
