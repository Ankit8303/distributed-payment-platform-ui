"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminPayout } from "@/lib/api/endpoints/admin-api";
import type { PayoutAdminResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export function useAdminPayout(payoutId: string) {
  const normalizedId = payoutId?.trim();

  return useQuery<PayoutAdminResponse, ApiError | Error>({
    queryKey: adminKeys.payout(normalizedId),
    queryFn: () => getAdminPayout(normalizedId),
    enabled: Boolean(normalizedId),
    staleTime: 30 * 1000,
    retry: 1,
  });
}
