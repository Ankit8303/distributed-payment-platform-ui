"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import {
  triggerAdminReconciliationCase,
  retryAdminReconciliationCase,
  runAdminReconciliation,
  auditAdminReconciliationLedger,
  auditAdminReconciliationBalances,
} from "@/lib/api/endpoints/admin-api";
import type {
  ReconciliationCaseAdminResponse,
  ReconciliationCaseDetailResponse,
  ReconciliationLedgerAuditReport,
  ReconciliationBalanceAuditReport,
} from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface MutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiError | Error, variables: TVariables) => void;
}

/**
 * Phase F8-C Admin Trigger Reconciliation Case Mutation Hook
 * Wraps POST /api/v1/admin/reconciliation/cases/{id}/trigger.
 *
 * INVARIANTS:
 * - `retry: false`: Operations must never silently replay.
 * - Targeted cache invalidation of the reconciliation case and list queries.
 */
export function useTriggerReconciliationCase(
  options?: MutationOptions<ReconciliationCaseAdminResponse, { caseId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation<ReconciliationCaseAdminResponse, ApiError | Error, { caseId: string }>({
    mutationFn: ({ caseId }) => triggerAdminReconciliationCase(caseId),
    retry: false,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.reconciliationCase(variables.caseId),
      });
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, "reconciliation-cases"],
      });
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

/**
 * Phase F8-C Admin Retry Reconciliation Case Mutation Hook
 * Wraps POST /api/v1/admin/reconciliation/cases/{id}/retry.
 */
export function useRetryReconciliationCase(
  options?: MutationOptions<ReconciliationCaseDetailResponse, { caseId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation<ReconciliationCaseDetailResponse, ApiError | Error, { caseId: string }>({
    mutationFn: ({ caseId }) => retryAdminReconciliationCase(caseId),
    retry: false,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.reconciliationCase(variables.caseId),
      });
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, "reconciliation-cases"],
      });
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

/**
 * Phase F8-C Admin System-Wide Reconciliation Sweep Mutation Hook
 * Wraps POST /api/v1/admin/reconciliation/run.
 */
export function useRunReconciliationSweep(
  options?: MutationOptions<number, void>
) {
  const queryClient = useQueryClient();

  return useMutation<number, ApiError | Error, void>({
    mutationFn: () => runAdminReconciliation(),
    retry: false,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, "reconciliation-cases"],
      });
      queryClient.invalidateQueries({
        queryKey: adminKeys.dashboard(),
      });
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

/**
 * Phase F8-C Admin Ledger Audit Report Mutation Hook
 * Wraps POST /api/v1/admin/reconciliation/audit/ledger.
 */
export function useAuditReconciliationLedger(
  options?: MutationOptions<ReconciliationLedgerAuditReport, void>
) {
  return useMutation<ReconciliationLedgerAuditReport, ApiError | Error, void>({
    mutationFn: () => auditAdminReconciliationLedger(),
    retry: false,
    onSuccess: (data, variables) => {
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

/**
 * Phase F8-C Admin Balance Audit Report Mutation Hook
 * Wraps POST /api/v1/admin/reconciliation/audit/balances.
 */
export function useAuditReconciliationBalances(
  options?: MutationOptions<ReconciliationBalanceAuditReport, void>
) {
  return useMutation<ReconciliationBalanceAuditReport, ApiError | Error, void>({
    mutationFn: () => auditAdminReconciliationBalances(),
    retry: false,
    onSuccess: (data, variables) => {
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}
