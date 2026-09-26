"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminDashboardSummary } from "@/lib/api/endpoints/admin-api";
import type { DashboardSummaryResponse } from "@/types/admin";
import { ApiError } from "@/lib/api/client";

/**
 * Phase F7-C Admin Dashboard Query Hook
 *
 * Fetches authoritative aggregate counts from GET /api/v1/admin/dashboard/summary.
 * Governed by server-state caching (30s stale time), manual refetch capability,
 * and standard RFC 7807 error propagation.
 */
export interface UseAdminDashboardOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

export function useAdminDashboard(options?: UseAdminDashboardOptions) {
  return useQuery<DashboardSummaryResponse, ApiError | Error>({
    queryKey: adminKeys.dashboard(),
    queryFn: ({ signal }) => getAdminDashboardSummary({ signal }),
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
