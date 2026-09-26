import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReconciliationPage from "@/app/(admin)/admin/reconciliation/page";
import ReconciliationCaseDetailPage from "@/app/(admin)/admin/reconciliation/[caseId]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import type {
  Page,
  ReconciliationCaseAdminResponse,
  ReconciliationCaseDetailResponse,
} from "@/types/admin";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/reconciliation",
}));

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

describe("Phase F8-C Admin Reconciliation Pages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Reconciliation Workspace (page.tsx)", () => {
    it("renders workspace header, filters, cases table, and triggers sweep modal", async () => {
      const mockPage: Page<ReconciliationCaseAdminResponse> = {
        content: [
          {
            id: "case-workspace-1",
            operationType: "PAYMENT",
            operationId: "op-workspace-1",
            providerReference: "ch_test_123",
            localStatus: "PENDING_RECONCILIATION",
            reconciliationStatus: "OPEN",
            discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
            attemptCount: 1,
            nextAttemptAt: null,
            resolvedAt: null,
            workerId: "worker-01",
            correlationId: "corr-rec-workspace",
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

      render(<ReconciliationPage />, { wrapper: createTestWrapper() });

      expect(screen.getByRole("heading", { name: "Reconciliation" })).toBeInTheDocument();
      expect(
        screen.getByText("Administrative discrepancy resolution & ledger integrity oversight")
      ).toBeInTheDocument();

      // Table displays case
      await waitFor(() => {
        expect(screen.getByTestId("reconciliation-cases-table")).toBeInTheDocument();
      });
      expect(screen.getByText("case-wor...")).toBeInTheDocument();

      // Open sweep modal
      const sweepBtn = screen.getByTestId("trigger-sweep-button");
      fireEvent.click(sweepBtn);
      expect(screen.getByTestId("reconciliation-action-modal")).toBeInTheDocument();
      expect(screen.getByText("Execute Reconciliation Sweep")).toBeInTheDocument();

      // Open Ledger audit modal
      fireEvent.click(screen.getByTestId("action-modal-cancel-button"));
      const ledgerAuditBtn = screen.getByTestId("open-ledger-audit-button");
      fireEvent.click(ledgerAuditBtn);
      expect(screen.getByTestId("reconciliation-audit-modal")).toBeInTheDocument();
      expect(screen.getByText("Ledger Zero-Sum Integrity Audit")).toBeInTheDocument();
    });
  });

  describe("Reconciliation Case Detail (caseId/page.tsx)", () => {
    it("renders all four authoritative sections and executes trigger action", async () => {
      const mockDetail: ReconciliationCaseDetailResponse = {
        id: "case-detail-uuid-777",
        operationType: "PAYMENT",
        operationId: "payment-uuid-888",
        providerReference: "ch_stripe_evidence_999",
        localStatus: "PENDING_RECONCILIATION",
        providerStatus: "succeeded",
        discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
        reconciliationStatus: "OPEN",
        resolution: null,
        attemptCount: 1,
        maxAttempts: 5,
        nextAttemptAt: "2026-09-26T14:00:00Z",
        leaseWorkerId: "worker-lease-01",
        leaseExpiresAt: "2026-09-26T14:30:00Z",
        lastError: "Timeout while verifying receipt",
        createdAt: "2026-09-26T12:00:00Z",
        updatedAt: "2026-09-26T12:05:00Z",
        resolvedAt: null,
        correlationId: "corr-detail-777",
        attempts: [
          {
            id: "attempt-1",
            reconciliationCaseId: "case-detail-uuid-777",
            attemptNumber: 1,
            workerId: "worker-agent-1",
            providerStatus: "succeeded",
            discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
            actionTaken: "QUERY_PROVIDER_API",
            status: "ANALYSIS_COMPLETE",
            errorMessage: null,
            createdAt: "2026-09-26T12:01:00Z",
          },
        ],
      };

      vi.spyOn(adminApi, "getAdminReconciliationCase").mockResolvedValue(mockDetail);
      const triggerSpy = vi
        .spyOn(adminApi, "triggerAdminReconciliationCase")
        .mockResolvedValue({
          id: "case-detail-uuid-777",
          operationType: "PAYMENT",
          operationId: "payment-uuid-888",
          providerReference: "ch_stripe_evidence_999",
          localStatus: "PENDING_RECONCILIATION",
          reconciliationStatus: "IN_PROGRESS",
          discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
          attemptCount: 2,
          nextAttemptAt: null,
          resolvedAt: null,
          workerId: "worker-01",
          correlationId: "corr-detail-777",
          createdAt: "2026-09-26T12:00:00Z",
          updatedAt: "2026-09-26T12:10:00Z",
        });

      const params = Promise.resolve({ caseId: "case-detail-uuid-777" });
      (params as any).status = "fulfilled";
      (params as any).value = { caseId: "case-detail-uuid-777" };

      render(
        <React.Suspense fallback={<div>Loading page...</div>}>
          <ReconciliationCaseDetailPage params={params} />
        </React.Suspense>,
        {
          wrapper: createTestWrapper(),
        }
      );

      // Heading
      await waitFor(() => {
        expect(screen.getByTestId("case-detail-heading")).toBeInTheDocument();
      });

      // SECTION 1: Case Information
      expect(screen.getByTestId("case-information-section")).toBeInTheDocument();
      expect(screen.getByText("Case Information")).toBeInTheDocument();
      expect(screen.getByTestId("case-operation-id")).toHaveTextContent("payment-uuid-888");

      // SECTION 2: Evidence
      expect(screen.getByTestId("evidence-section")).toBeInTheDocument();
      expect(screen.getByText("Reconciliation Evidence")).toBeInTheDocument();
      expect(screen.getByTestId("evidence-provider-ref")).toHaveTextContent(
        "ch_stripe_evidence_999"
      );
      expect(screen.getByText("Timeout while verifying receipt")).toBeInTheDocument();

      // SECTION 3: Actions
      expect(screen.getByTestId("actions-section")).toBeInTheDocument();
      expect(screen.getByText("Authoritative Actions")).toBeInTheDocument();

      // SECTION 4: Audit Information & Attempts
      expect(screen.getByTestId("audit-information-section")).toBeInTheDocument();
      expect(screen.getByTestId("case-correlation-id")).toHaveTextContent("corr-detail-777");
      expect(screen.getByTestId("attempts-table")).toBeInTheDocument();
      expect(screen.getByTestId("attempt-row-1")).toBeInTheDocument();

      // Open and confirm Trigger modal
      const triggerBtn = screen.getByTestId("trigger-case-button");
      fireEvent.click(triggerBtn);

      const confirmBtn = screen.getByTestId("action-modal-confirm-button");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(triggerSpy).toHaveBeenCalledWith("case-detail-uuid-777");
      });
      expect(
        screen.getByText("Reconciliation execution triggered successfully.")
      ).toBeInTheDocument();
    });
  });
});
