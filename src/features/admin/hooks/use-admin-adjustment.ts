"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminFinancialAdjustment } from "@/lib/api/endpoints/admin-api";
import type { FinancialAdjustmentResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

/**
 * Standard RFC 4122 UUID validation pattern matching project conventions.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a given string is a valid RFC 4122 UUID.
 */
export function isValidAdjustmentUuid(id: string): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
}

export interface UseAdminAdjustmentOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

/**
 * Phase F7-H-A Admin Financial Adjustment Detail Query Hook
 * Fetches authoritative adjustment record from GET /api/v1/admin/adjustments/{id}.
 *
 * Invariants:
 * 1. Financial Safety & Query Retry Policy: Query retry defaults to global queryClient
 *    minimal safe retry policy (single retry `retry: 1` in AppProviders for transient network errors,
 *    never aggressive), and respects `options?.retry` override.
 * 2. Strict ID Validation: Query is disabled (`enabled: false`) if adjustmentId is missing,
 *    empty, whitespace-only, or not a valid RFC 4122 UUID format. Never issues request with invalid ID.
 * 3. Authoritative Read: Exposes authoritative backend response without local transformation
 *    or financial recalculation. Zero manufactured fallback data.
 * 4. Zero Polling: No polling, intervals, or refetch timers. Financial adjustments are synchronous.
 */
export function useAdminAdjustment(
  adjustmentId: string | undefined,
  options?: UseAdminAdjustmentOptions
) {
  const normalizedId = adjustmentId?.trim();
  const isEnabled = Boolean(normalizedId && isValidAdjustmentUuid(normalizedId));

  return useQuery<FinancialAdjustmentResponse, ApiError | Error>({
    queryKey: adminKeys.adjustment(normalizedId || ""),
    queryFn: ({ signal }) => getAdminFinancialAdjustment(normalizedId!, { signal }),
    enabled: isEnabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
