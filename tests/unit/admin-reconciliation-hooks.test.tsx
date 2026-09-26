import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useAdminReconciliationCases,
  normalizeReconciliationQueryParams,
} from "@/features/admin/hooks/use-admin-reconciliation-cases";
import { useAdminReconciliationCase } from "@/features/admin/hooks/use-admin-reconciliation-case";
import {
  useTriggerReconciliationCase,
  useRetryReconciliationCase,
  useRunReconciliationSweep,
  useAuditReconciliationLedger,
  useAuditReconciliationBalances,
} from "@/features/admin/hooks/use-admin-reconciliation-mutations";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import type {
  Page,
  ReconciliationCaseAdminResponse,
  ReconciliationCaseDetailResponse,
  ReconciliationLedgerAuditReport,
  ReconciliationBalanceAuditReport,
} from "@/types/admin";

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("Phase F8-C Admin Reconciliation Hooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Query Parameter Normalizer", () => {
    it("normalizes undefined params to undefined", () => {
      expect(normalizeReconciliationQueryParams(undefined)).toBeUndefined();
    });

    it("normalizes status, page, size, and sort", () => {
      const normalized = normalizeReconciliationQueryParams({
        page: 1,
        size: 10,
        sort: "createdAt,desc",
        status: "OPEN",
      });
      expect(normalized).toEqual({
        page: 1,
        size: 10,
        sort: "createdAt,desc",
        status: "OPEN",
      });
    });
  });

  describe("useAdminReconciliationCases Hook", () => {
    it("fetches paginated reconciliation cases", async () => {
      const mockPage: Page<ReconciliationCaseAdminResponse> = {
        content: [
          {
            id: "case-1",
            operationType: "PAYMENT",
            operationId: "op-1",
            providerReference: "prov-ref-1",
            localStatus: "PENDING_RECONCILIATION",
            reconciliationStatus: "OPEN",
            discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
            attemptCount: 1,
            nextAttemptAt: null,
            resolvedAt: null,
            workerId: "worker-1",
            correlationId: "corr-1",
            createdAt: "2026-09-26T12:00:00Z",
            updatedAt: "2026-09-26T12:05:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        empty: false,
        pageable: {
          pageNumber: 0,
          pageSize: 20,
          sort: { sorted: false, unsorted: true, empty: true },
          offset: 0,
          paged: true,
          unpaged: false,
        },
        sort: { sorted: false, unsorted: true, empty: true },
        numberOfElements: 1,
      };

      vi.spyOn(adminApi, "getAdminReconciliationCases").mockResolvedValue(mockPage);

      const { result } = renderHook(
        () => useAdminReconciliationCases({ status: "OPEN" }),
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.content).toHaveLength(1);
      expect(result.current.data?.content?.[0]?.id).toBe("case-1");
    });
  });

  describe("useAdminReconciliationCase Hook", () => {
    it("fetches single reconciliation case detail", async () => {
      const mockDetail: ReconciliationCaseDetailResponse = {
        id: "case-123",
        operationType: "PAYMENT",
        operationId: "pay-123",
        providerReference: "ext-123",
        localStatus: "PENDING_RECONCILIATION",
        providerStatus: "SETTLED",
        discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
        reconciliationStatus: "OPEN",
        resolution: null,
        attemptCount: 1,
        maxAttempts: 5,
        nextAttemptAt: "2026-09-26T14:00:00Z",
        leaseWorkerId: null,
        leaseExpiresAt: null,
        lastError: null,
        createdAt: "2026-09-26T12:00:00Z",
        updatedAt: "2026-09-26T12:05:00Z",
        resolvedAt: null,
        correlationId: "corr-case-123",
        attempts: [
          {
            id: "att-1",
            reconciliationCaseId: "case-123",
            attemptNumber: 1,
            workerId: "worker-alpha",
            providerStatus: "SETTLED",
            discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
            actionTaken: "VERIFY_GATEWAY_RECEIPT",
            status: "ANALYSIS_COMPLETE",
            errorMessage: null,
            createdAt: "2026-09-26T12:01:00Z",
          },
        ],
      };

      vi.spyOn(adminApi, "getAdminReconciliationCase").mockResolvedValue(mockDetail);

      const { result } = renderHook(
        () => useAdminReconciliationCase("case-123"),
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe("case-123");
      expect(result.current.data?.attempts).toHaveLength(1);
    });
  });

  describe("Reconciliation Mutation Hooks (retry: false Invariant)", () => {
    it("triggers case execution and invalidates queries without auto-retry", async () => {
      const mockResponse: ReconciliationCaseAdminResponse = {
        id: "case-trigger-1",
        operationType: "PAYMENT",
        operationId: "op-1",
        providerReference: "ref-1",
        localStatus: "PENDING_RECONCILIATION",
        reconciliationStatus: "IN_PROGRESS",
        discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
        attemptCount: 2,
        nextAttemptAt: null,
        resolvedAt: null,
        workerId: "worker-trigger",
        correlationId: "corr-trigger",
        createdAt: "2026-09-26T12:00:00Z",
        updatedAt: "2026-09-26T12:10:00Z",
      };

      const triggerSpy = vi
        .spyOn(adminApi, "triggerAdminReconciliationCase")
        .mockResolvedValue(mockResponse);

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useTriggerReconciliationCase({ onSuccess }),
        { wrapper: createTestWrapper() }
      );

      result.current.mutate({ caseId: "case-trigger-1" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(triggerSpy).toHaveBeenCalledWith("case-trigger-1");
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("retries failed case resolution without auto-retry", async () => {
      const mockDetail: ReconciliationCaseDetailResponse = {
        id: "case-retry-1",
        operationType: "REFUND",
        operationId: "ref-1",
        providerReference: "ext-ref",
        localStatus: "FAILED",
        providerStatus: "REVERSED",
        discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
        reconciliationStatus: "IN_PROGRESS",
        resolution: null,
        attemptCount: 3,
        maxAttempts: 5,
        nextAttemptAt: "2026-09-26T15:00:00Z",
        leaseWorkerId: null,
        leaseExpiresAt: null,
        lastError: null,
        createdAt: "2026-09-26T12:00:00Z",
        updatedAt: "2026-09-26T12:15:00Z",
        resolvedAt: null,
        correlationId: "corr-retry",
        attempts: [],
      };

      const retrySpy = vi
        .spyOn(adminApi, "retryAdminReconciliationCase")
        .mockResolvedValue(mockDetail);

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useRetryReconciliationCase({ onSuccess }),
        { wrapper: createTestWrapper() }
      );

      result.current.mutate({ caseId: "case-retry-1" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(retrySpy).toHaveBeenCalledWith("case-retry-1");
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("runs system reconciliation sweep worker returning processed count", async () => {
      const sweepSpy = vi
        .spyOn(adminApi, "runAdminReconciliation")
        .mockResolvedValue(14);

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useRunReconciliationSweep({ onSuccess }),
        { wrapper: createTestWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(sweepSpy).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(14, undefined);
    });

    it("executes ledger audit report without auto-retry", async () => {
      const mockReport: ReconciliationLedgerAuditReport = {
        transactionsAudited: 1500,
        findingsCount: 0,
        findings: [],
      };

      const auditSpy = vi
        .spyOn(adminApi, "auditAdminReconciliationLedger")
        .mockResolvedValue(mockReport);

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useAuditReconciliationLedger({ onSuccess }),
        { wrapper: createTestWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(auditSpy).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(mockReport, undefined);
    });

    it("executes balance audit report without auto-retry", async () => {
      const mockReport: ReconciliationBalanceAuditReport = {
        accountsAudited: 250,
        findingsCount: 0,
        findings: [],
      };

      const auditSpy = vi
        .spyOn(adminApi, "auditAdminReconciliationBalances")
        .mockResolvedValue(mockReport);

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useAuditReconciliationBalances({ onSuccess }),
        { wrapper: createTestWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(auditSpy).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(mockReport, undefined);
    });
  });
});
