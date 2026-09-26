import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ReconciliationStatusBadge,
  DiscrepancyBadge,
  OperationTypeBadge,
} from "@/features/admin/components/reconciliation-status-badge";
import { ReconciliationFilters } from "@/features/admin/components/reconciliation-filters";
import { ReconciliationTable } from "@/features/admin/components/reconciliation-table";
import { ReconciliationActionModal } from "@/features/admin/components/reconciliation-action-modal";
import { ReconciliationAuditModal } from "@/features/admin/components/reconciliation-audit-modal";
import type {
  ReconciliationCaseAdminResponse,
  ReconciliationLedgerAuditReport,
  ReconciliationBalanceAuditReport,
} from "@/types/admin";

describe("Phase F8-C Admin Reconciliation Components", () => {
  describe("Status, Discrepancy, and Operation Badges", () => {
    it("renders all reconciliation status badges", () => {
      const { rerender } = render(<ReconciliationStatusBadge status="OPEN" />);
      expect(screen.getByText("Open")).toBeInTheDocument();

      rerender(<ReconciliationStatusBadge status="IN_PROGRESS" />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();

      rerender(<ReconciliationStatusBadge status="RETRY_REQUIRED" />);
      expect(screen.getByText("Retry Required")).toBeInTheDocument();

      rerender(<ReconciliationStatusBadge status="RESOLVED" />);
      expect(screen.getByText("Resolved")).toBeInTheDocument();

      rerender(<ReconciliationStatusBadge status="MANUAL_REVIEW" />);
      expect(screen.getByText("Manual Review")).toBeInTheDocument();
    });

    it("renders formatted discrepancy badges", () => {
      const { rerender } = render(
        <DiscrepancyBadge type="PROVIDER_SUCCESS_LOCAL_PENDING" />
      );
      expect(
        screen.getByText("Provider Success / Local Pending")
      ).toBeInTheDocument();

      rerender(<DiscrepancyBadge type="LEDGER_STATE_MISMATCH" />);
      expect(screen.getByText("Ledger State Mismatch")).toBeInTheDocument();

      rerender(<DiscrepancyBadge type={null} />);
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders operation type badges", () => {
      const { rerender } = render(<OperationTypeBadge operationType="PAYMENT" />);
      expect(screen.getByText("PAYMENT")).toBeInTheDocument();

      rerender(<OperationTypeBadge operationType="REFUND" />);
      expect(screen.getByText("REFUND")).toBeInTheDocument();
    });
  });

  describe("Reconciliation Filters", () => {
    it("renders filter controls and submits selected status", () => {
      const onApply = vi.fn();
      const onReset = vi.fn();

      render(
        <ReconciliationFilters
          initialFilters={{ page: 0, size: 20 }}
          onApplyFilters={onApply}
          onResetFilters={onReset}
        />
      );

      const statusSelect = screen.getByTestId("reconciliation-status-filter");
      expect(statusSelect).toBeInTheDocument();

      fireEvent.change(statusSelect, { target: { value: "OPEN" } });
      fireEvent.click(screen.getByTestId("reconciliation-apply-filters-button"));

      expect(onApply).toHaveBeenCalledWith({
        page: 0,
        size: 20,
        sort: "createdAt,desc",
        status: "OPEN",
      });
    });

    it("resets filter when reset button is clicked", () => {
      const onApply = vi.fn();
      const onReset = vi.fn();

      render(
        <ReconciliationFilters
          initialFilters={{ status: "OPEN" }}
          onApplyFilters={onApply}
          onResetFilters={onReset}
        />
      );

      const resetBtn = screen.getByTestId("reconciliation-reset-filters-button");
      fireEvent.click(resetBtn);
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("Reconciliation Table", () => {
    it("renders loading state", () => {
      render(<ReconciliationTable cases={[]} isLoading={true} />);
      expect(screen.getByTestId("reconciliation-table-loading")).toBeInTheDocument();
    });

    it("renders empty state when no cases match", () => {
      render(<ReconciliationTable cases={[]} isLoading={false} />);
      expect(screen.getByTestId("reconciliation-table-empty")).toBeInTheDocument();
      expect(
        screen.getByText("No reconciliation cases found")
      ).toBeInTheDocument();
    });

    it("renders populated reconciliation cases table with formatted cells", () => {
      const mockCases: ReconciliationCaseAdminResponse[] = [
        {
          id: "33333333-3333-3333-3333-333333333333",
          operationType: "PAYMENT",
          operationId: "44444444-4444-4444-4444-444444444444",
          providerReference: "ch_mock_stripe_123",
          localStatus: "PENDING_RECONCILIATION",
          reconciliationStatus: "OPEN",
          discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
          attemptCount: 1,
          nextAttemptAt: null,
          resolvedAt: null,
          workerId: "worker-01",
          correlationId: "corr-rec-1",
          createdAt: "2026-09-26T12:00:00Z",
          updatedAt: "2026-09-26T12:05:00Z",
        },
      ];

      render(<ReconciliationTable cases={mockCases} isLoading={false} />);

      expect(screen.getByTestId("reconciliation-cases-table")).toBeInTheDocument();
      expect(
        screen.getByTestId("reconciliation-row-33333333-3333-3333-3333-333333333333")
      ).toBeInTheDocument();
      expect(screen.getByText("PAYMENT")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(
        screen.getByText("Provider Success / Local Pending")
      ).toBeInTheDocument();
      expect(screen.getByText("PENDING_RECONCILIATION")).toBeInTheDocument();
    });
  });

  describe("Reconciliation Action Modal", () => {
    it("renders action details and calls onConfirm on click", () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ReconciliationActionModal
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Trigger Reconciliation Execution"
          actionLabel="Execute Action"
          caseId="case-abc"
          reference="ref-xyz"
          consequence="Dispatches the analysis worker."
        />
      );

      expect(screen.getByText("Trigger Reconciliation Execution")).toBeInTheDocument();
      expect(screen.getByTestId("action-modal-case-id")).toHaveTextContent("case-abc");
      expect(screen.getByText("Dispatches the analysis worker.")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("action-modal-confirm-button"));
      expect(onConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId("action-modal-cancel-button"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("disables buttons and shows loader when isPending", () => {
      const onConfirm = vi.fn();
      render(
        <ReconciliationActionModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={onConfirm}
          title="Trigger Analysis"
          actionLabel="Execute"
          consequence="Consequence test"
          isPending={true}
        />
      );

      const confirmBtn = screen.getByTestId("action-modal-confirm-button");
      expect(confirmBtn).toBeDisabled();
      expect(screen.getByText("Executing...")).toBeInTheDocument();
    });
  });

  describe("Reconciliation Audit Modal", () => {
    it("renders ledger audit report with zero findings pass banner", () => {
      const mockLedgerReport: ReconciliationLedgerAuditReport = {
        transactionsAudited: 1200,
        findingsCount: 0,
        findings: [],
      };

      render(
        <ReconciliationAuditModal
          isOpen={true}
          onClose={vi.fn()}
          auditType="ledger"
          onRunAudit={vi.fn()}
          ledgerReport={mockLedgerReport}
        />
      );

      expect(
        screen.getByText("Ledger Zero-Sum Integrity Audit")
      ).toBeInTheDocument();
      expect(screen.getByTestId("audited-items-count")).toHaveTextContent("1,200");
      expect(screen.getByTestId("findings-count")).toHaveTextContent("0");
      expect(screen.getByTestId("audit-pass-banner")).toBeInTheDocument();
    });

    it("renders balance audit report with findings and formatted minor units", () => {
      const mockBalanceReport: ReconciliationBalanceAuditReport = {
        accountsAudited: 150,
        findingsCount: 1,
        findings: [
          {
            accountId: "acc-discrepant",
            materializedBalance: 50000,
            calculatedLedgerBalance: 40000,
            delta: 10000,
          },
        ],
      };

      render(
        <ReconciliationAuditModal
          isOpen={true}
          onClose={vi.fn()}
          auditType="balances"
          onRunAudit={vi.fn()}
          balanceReport={mockBalanceReport}
        />
      );

      expect(
        screen.getByText("Materialized Balance Consistency Audit")
      ).toBeInTheDocument();
      expect(screen.getByTestId("audited-items-count")).toHaveTextContent("150");
      expect(screen.getByTestId("findings-count")).toHaveTextContent("1");
      expect(screen.getByTestId("audit-findings-alert")).toBeInTheDocument();
      expect(screen.getByText("acc-discrepant")).toBeInTheDocument();
      // Formatted via formatMinorUnits: 50000 -> $500.00
      expect(screen.getByText("$500.00")).toBeInTheDocument();
      expect(screen.getByText("$400.00")).toBeInTheDocument();
      expect(screen.getByText("$100.00")).toBeInTheDocument();
    });
  });
});
