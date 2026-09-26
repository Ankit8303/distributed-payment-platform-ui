"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { createAdminFinancialAdjustment } from "@/lib/api/endpoints/admin-api";
import type {
  FinancialAdjustmentCreateRequest,
  FinancialAdjustmentResponse,
} from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface CreateAdminFinancialAdjustmentVariables {
  request: FinancialAdjustmentCreateRequest;
  idempotencyKey: string;
}

export interface UseAdminCreateAdjustmentOptions {
  onSuccess?: (
    data: FinancialAdjustmentResponse,
    variables: CreateAdminFinancialAdjustmentVariables
  ) => void;
  onError?: (
    error: ApiError | Error,
    variables: CreateAdminFinancialAdjustmentVariables
  ) => void;
}

/**
 * Phase F7-H-A Admin Financial Adjustment Mutation Hook
 * Wraps POST /api/v1/admin/adjustments using React Query mutation infrastructure.
 *
 * CRITICAL FINANCIAL SAFETY INVARIANTS:
 * 1. ZERO AUTOMATIC RETRIES (`retry: false`): Financial adjustments create immediate,
 *    synchronous double-entry ledger mutations. Never silently retry the POST.
 * 2. CALLER-SUPPLIED IDEMPOTENCY KEY: The hook MUST NOT generate an idempotency key.
 *    Key generation is owned strictly by explicit operator confirmation in Phase F7-H-C.
 * 3. NO OPTIMISTIC FINANCIAL UPDATES: Balances, ledger entries, and adjustment states
 *    are never fabricated on the client. After mutation success, authoritative server
 *    data is synchronized via targeted cache invalidation.
 * 4. ZERO FINANCIAL ARITHMETIC: Frontend does not calculate balances, diffs, or fees.
 *    Authoritative figures returned by the backend are preserved intact.
 * 5. TARGETED CACHE INVALIDATION: Invalidates exactly the affected source account,
 *    target account, their balance summaries, account ledger entries, and adjustment detail.
 *    Unrelated caches are never touched.
 */
export function useAdminCreateAdjustment(
  options?: UseAdminCreateAdjustmentOptions
) {
  const queryClient = useQueryClient();

  return useMutation<
    FinancialAdjustmentResponse,
    ApiError | Error,
    CreateAdminFinancialAdjustmentVariables
  >({
    mutationFn: ({ request, idempotencyKey }) =>
      createAdminFinancialAdjustment(request, idempotencyKey),
    retry: false,
    onSuccess: (data, variables) => {
      // Targeted cache invalidations:
      // 1. Source account detail, balance summary, and account ledger entries
      queryClient.invalidateQueries({
        queryKey: adminKeys.account(data.sourceAccountId),
      });
      queryClient.invalidateQueries({
        queryKey: adminKeys.balanceSummary(data.sourceAccountId),
      });
      queryClient.invalidateQueries({
        queryKey: adminKeys.accountEntries(data.sourceAccountId),
      });

      // 2. Target account detail, balance summary, and account ledger entries
      queryClient.invalidateQueries({
        queryKey: adminKeys.account(data.targetAccountId),
      });
      queryClient.invalidateQueries({
        queryKey: adminKeys.balanceSummary(data.targetAccountId),
      });
      queryClient.invalidateQueries({
        queryKey: adminKeys.accountEntries(data.targetAccountId),
      });

      // 3. Authoritative adjustment detail
      queryClient.invalidateQueries({
        queryKey: adminKeys.adjustment(data.adjustmentId),
      });

      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}
