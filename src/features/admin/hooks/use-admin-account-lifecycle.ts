"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import {
  freezeAdminAccount,
  unfreezeAdminAccount,
} from "@/lib/api/endpoints/admin-api";
import type {
  AccountAdminResponse,
  AccountLifecycleRequest,
} from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface FreezeAccountVariables {
  accountId: string;
  request: AccountLifecycleRequest;
}

export interface UnfreezeAccountVariables {
  accountId: string;
  request: AccountLifecycleRequest;
}

export interface UseAdminAccountLifecycleOptions {
  onFreezeSuccess?: (data: AccountAdminResponse, variables: FreezeAccountVariables) => void;
  onUnfreezeSuccess?: (data: AccountAdminResponse, variables: UnfreezeAccountVariables) => void;
}

/**
 * Phase F7-G-A Admin Account Lifecycle Mutation Hook
 * Provides operations to freeze and unfreeze accounts via:
 *   POST /api/v1/admin/accounts/{accountId}/freeze
 *   POST /api/v1/admin/accounts/{accountId}/unfreeze
 *
 * Invariants:
 * 1. Financial & Operational Safety: Mutations NEVER automatically retry (`retry: false`).
 * 2. Cache Invalidation: On success, targeted queries (account detail, balance summary, account list)
 *    are invalidated to synchronize with authoritative backend state.
 * 3. No Optimistic Financial State: Frontend does not fabricate balances or statuses optimistically.
 */
export function useAdminAccountLifecycle(options?: UseAdminAccountLifecycleOptions) {
  const queryClient = useQueryClient();

  const invalidateAccountQueries = (accountId: string) => {
    const normalizedId = accountId.trim();
    queryClient.invalidateQueries({ queryKey: adminKeys.account(normalizedId) });
    queryClient.invalidateQueries({ queryKey: adminKeys.balanceSummary(normalizedId) });
    queryClient.invalidateQueries({ queryKey: adminKeys.accounts() });
  };

  const freezeMutation = useMutation<AccountAdminResponse, ApiError | Error, FreezeAccountVariables>({
    mutationFn: ({ accountId, request }) => freezeAdminAccount(accountId, request),
    retry: false,
    onSuccess: (data, variables) => {
      invalidateAccountQueries(variables.accountId);
      options?.onFreezeSuccess?.(data, variables);
    },
  });

  const unfreezeMutation = useMutation<AccountAdminResponse, ApiError | Error, UnfreezeAccountVariables>({
    mutationFn: ({ accountId, request }) => unfreezeAdminAccount(accountId, request),
    retry: false,
    onSuccess: (data, variables) => {
      invalidateAccountQueries(variables.accountId);
      options?.onUnfreezeSuccess?.(data, variables);
    },
  });

  return {
    // Freeze operations
    freeze: freezeMutation.mutateAsync,
    freezeSync: freezeMutation.mutate,
    freezeAccount: (accountId: string, request: AccountLifecycleRequest) =>
      freezeMutation.mutateAsync({ accountId, request }),
    isFreezing: freezeMutation.isPending,
    freezeError: freezeMutation.error,
    freezeMutation,

    // Unfreeze operations
    unfreeze: unfreezeMutation.mutateAsync,
    unfreezeSync: unfreezeMutation.mutate,
    unfreezeAccount: (accountId: string, request: AccountLifecycleRequest) =>
      unfreezeMutation.mutateAsync({ accountId, request }),
    isUnfreezing: unfreezeMutation.isPending,
    unfreezeError: unfreezeMutation.error,
    unfreezeMutation,

    // Reset both mutations
    reset: () => {
      freezeMutation.reset();
      unfreezeMutation.reset();
    },
  };
}
