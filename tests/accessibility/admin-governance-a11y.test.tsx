import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationActionModal } from "@/features/admin/components/notification-action-modal";
import { ReconciliationActionModal } from "@/features/admin/components/reconciliation-action-modal";
import { ReconciliationAuditModal } from "@/features/admin/components/reconciliation-audit-modal";
import { UserTable } from "@/features/admin/components/user-table";
import { NotificationTable } from "@/features/admin/components/notification-table";
import { RefundTable } from "@/features/admin/components/refund-table";
import { PayoutTable } from "@/features/admin/components/payout-table";
import { UserStatusBadge, UserRoleBadge } from "@/features/admin/components/user-status-badge";
import { NotificationStatusBadge, NotificationChannelBadge } from "@/features/admin/components/notification-status-badge";
import { AdminRefundStatusBadge } from "@/features/admin/components/refund-status-badge";
import { AdminPayoutStatusBadge } from "@/features/admin/components/payout-status-badge";
import type { UserAdminResponse, NotificationAdminResponse, RefundAdminResponse, PayoutAdminResponse } from "@/types/admin";

describe("Phase F8-E Accessibility Hardening — Admin Governance & Inclusive UX", () => {
  describe("NotificationActionModal Focus Management & Semantics", () => {
    it("renders with dialog role, aria-modal, aria-labelledby, and aria-describedby", () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <NotificationActionModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Retry Failed Notification"
          description="Queues an immediate retry for delivery."
          actionLabel="Retry Now"
          consequence="Dispatches delivery attempt to worker."
          isPending={false}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "notification-action-modal-title");
      expect(dialog).toHaveAttribute("aria-describedby", "notification-action-modal-desc");
      expect(screen.getByText("Retry Failed Notification")).toBeInTheDocument();
    });

    it("closes when Escape key is pressed", () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <NotificationActionModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Retry Notification"
          description="Queues retry."
          actionLabel="Retry"
          consequence="One attempt will be made."
          isPending={false}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("does NOT close on Escape when isPending is true", () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <NotificationActionModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Retrying..."
          description="Processing."
          actionLabel="Retry"
          consequence="Running."
          isPending={true}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe("ReconciliationActionModal Focus Management & Semantics", () => {
    it("renders with dialog role, aria-modal, and accessible attributes", () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <ReconciliationActionModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Force Settlement Reconciliation"
          actionLabel="Confirm Settlement"
          caseId="rc-case-12345"
          reference="TX-99999"
          consequence="Forces settlement update in PostgreSQL."
          isPending={false}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "reconciliation-action-title");
      expect(dialog).toHaveAttribute("aria-describedby", "reconciliation-action-desc");
    });

    it("closes when Escape key is pressed", () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <ReconciliationActionModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Operational Action"
          actionLabel="Confirm"
          consequence="Consequence details."
          isPending={false}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("ReconciliationAuditModal Focus Management & Semantics", () => {
    it("renders with dialog role, aria-modal, and accessible headers", () => {
      const handleClose = vi.fn();
      const handleRunAudit = vi.fn();

      render(
        <ReconciliationAuditModal
          isOpen={true}
          onClose={handleClose}
          auditType="ledger"
          onRunAudit={handleRunAudit}
          isLoading={false}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "audit-modal-title");
      expect(dialog).toHaveAttribute("aria-describedby", "audit-modal-desc");
      expect(screen.getByRole("button", { name: /Close audit modal/i })).toBeInTheDocument();
    });

    it("closes on Escape key when not loading", () => {
      const handleClose = vi.fn();
      const handleRunAudit = vi.fn();

      render(
        <ReconciliationAuditModal
          isOpen={true}
          onClose={handleClose}
          auditType="balances"
          onRunAudit={handleRunAudit}
          isLoading={false}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Table Accessibility (Headers, Semantic Rows, Accessible Link Names)", () => {
    it("UserTable has th scope='col' and accessible action link labels", () => {
      const mockUsers: UserAdminResponse[] = [
        {
          id: "12345678-aaaa-bbbb-cccc-111122223333",
          email: "governance@example.com",
          role: "ADMIN",
          status: "ACTIVE",
          createdAt: "2026-09-01T12:00:00Z",
          updatedAt: "2026-09-01T12:00:00Z",
        },
      ];

      render(<UserTable users={mockUsers} isLoading={false} />);

      const headers = screen.getAllByRole("columnheader");
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach((th) => {
        expect(th).toHaveAttribute("scope", "col");
      });

      const inspectLink = screen.getByRole("link", { name: /Inspect user governance@example\.com/i });
      expect(inspectLink).toBeInTheDocument();
    });

    it("NotificationTable has th scope='col' and accessible action link labels", () => {
      const mockNotifications: NotificationAdminResponse[] = [
        {
          id: "notif-uuid-1111-2222-3333-444455556666",
          eventId: "event-1111-2222-3333-444455556666",
          eventType: "PAYMENT_SETTLED",
          aggregateId: "agg-1111",
          recipient: "customer@example.com",
          channel: "EMAIL",
          templateCode: "PAYMENT_RECEIPT",
          templateVersion: 1,
          status: "SENT",
          attemptCount: 1,
          maxAttempts: 3,
          nextAttemptAt: null,
          leaseWorkerId: null,
          leaseExpiresAt: null,
          renderedSubject: "Payment settled",
          renderedBody: "Your payment has settled.",
          createdAt: "2026-09-01T12:00:00Z",
          updatedAt: "2026-09-01T12:01:00Z",
          sentAt: "2026-09-01T12:01:00Z",
        },
      ];

      render(<NotificationTable notifications={mockNotifications} isLoading={false} />);

      const headers = screen.getAllByRole("columnheader");
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach((th) => {
        expect(th).toHaveAttribute("scope", "col");
      });

      const inspectLink = screen.getByRole("link", { name: /Inspect notification notif-uuid-1111-2222-3333-444455556666/i });
      expect(inspectLink).toBeInTheDocument();
    });

    it("RefundTable has th scope='col' and accessible action link labels", () => {
      const mockRefunds: RefundAdminResponse[] = [
        {
          id: "ref-9999-8888-7777-666655554444",
          paymentId: "pay-1111-2222-3333-444455556666",
          amountMinor: 5000,
          currency: "USD",
          status: "SETTLED",
          reason: "Customer request",
          providerReference: "REF-PROVIDER-123",
          createdAt: "2026-09-01T12:00:00Z",
          updatedAt: "2026-09-01T12:01:00Z",
        },
      ];

      render(<RefundTable refunds={mockRefunds} isLoading={false} />);

      const headers = screen.getAllByRole("columnheader");
      headers.forEach((th) => {
        expect(th).toHaveAttribute("scope", "col");
      });

      const inspectLink = screen.getByRole("link", { name: /Inspect refund ref-9999-8888-7777-666655554444/i });
      expect(inspectLink).toBeInTheDocument();
    });

    it("PayoutTable has th scope='col' and accessible action link labels", () => {
      const mockPayouts: PayoutAdminResponse[] = [
        {
          id: "po-9999-8888-7777-666655554444",
          accountId: "acct-1111-2222-3333-444455556666",
          amountMinor: 75000,
          currency: "USD",
          status: "SETTLED",
          providerReference: "PO-PROVIDER-456",
          createdAt: "2026-09-01T12:00:00Z",
          updatedAt: "2026-09-01T12:01:00Z",
        },
      ];

      render(<PayoutTable payouts={mockPayouts} isLoading={false} />);

      const headers = screen.getAllByRole("columnheader");
      headers.forEach((th) => {
        expect(th).toHaveAttribute("scope", "col");
      });

      const inspectLink = screen.getByRole("link", { name: /Inspect payout po-9999-8888-7777-666655554444/i });
      expect(inspectLink).toBeInTheDocument();
    });
  });

  describe("Status Indicators Non-Reliance on Color Alone", () => {
    it("UserStatusBadge displays visible text for each status", () => {
      const { rerender } = render(<UserStatusBadge status="ACTIVE" />);
      expect(screen.getByText("Active")).toBeInTheDocument();

      rerender(<UserStatusBadge status="SUSPENDED" />);
      expect(screen.getByText("Suspended")).toBeInTheDocument();

      rerender(<UserStatusBadge status="LOCKED" />);
      expect(screen.getByText("Locked")).toBeInTheDocument();

      rerender(<UserStatusBadge status="DELETED" />);
      expect(screen.getByText("Deleted")).toBeInTheDocument();
    });

    it("UserRoleBadge displays visible text for each role", () => {
      const { rerender } = render(<UserRoleBadge role="ADMIN" />);
      expect(screen.getByText("Admin")).toBeInTheDocument();

      rerender(<UserRoleBadge role="MERCHANT" />);
      expect(screen.getByText("Merchant")).toBeInTheDocument();

      rerender(<UserRoleBadge role="CUSTOMER" />);
      expect(screen.getByText("Customer")).toBeInTheDocument();
    });

    it("NotificationStatusBadge displays visible text for each status", () => {
      const { rerender } = render(<NotificationStatusBadge status="PENDING" />);
      expect(screen.getByText("Pending")).toBeInTheDocument();

      rerender(<NotificationStatusBadge status="PROCESSING" />);
      expect(screen.getByText("Processing")).toBeInTheDocument();

      rerender(<NotificationStatusBadge status="SENT" />);
      expect(screen.getByText("Sent")).toBeInTheDocument();

      rerender(<NotificationStatusBadge status="FAILED" />);
      expect(screen.getByText("Failed")).toBeInTheDocument();

      rerender(<NotificationStatusBadge status="PERMANENTLY_FAILED" />);
      expect(screen.getByText("PERMANENTLY_FAILED")).toBeInTheDocument();
    });

    it("NotificationChannelBadge displays visible text for each channel", () => {
      const { rerender } = render(<NotificationChannelBadge channel="EMAIL" />);
      expect(screen.getByText("Email")).toBeInTheDocument();

      rerender(<NotificationChannelBadge channel="SMS" />);
      expect(screen.getByText("SMS")).toBeInTheDocument();

      rerender(<NotificationChannelBadge channel="WEBHOOK" />);
      expect(screen.getByText("Webhook")).toBeInTheDocument();
    });

    it("AdminRefundStatusBadge displays visible text for each status", () => {
      const { rerender } = render(<AdminRefundStatusBadge status="REQUESTED" />);
      expect(screen.getByText("Requested")).toBeInTheDocument();

      rerender(<AdminRefundStatusBadge status="SETTLED" />);
      expect(screen.getByText("Settled")).toBeInTheDocument();

      rerender(<AdminRefundStatusBadge status="FAILED" />);
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("AdminPayoutStatusBadge displays visible text for each status", () => {
      const { rerender } = render(<AdminPayoutStatusBadge status="REQUESTED" />);
      expect(screen.getByText("Requested")).toBeInTheDocument();

      rerender(<AdminPayoutStatusBadge status="SETTLED" />);
      expect(screen.getByText("Settled")).toBeInTheDocument();

      rerender(<AdminPayoutStatusBadge status="FAILED" />);
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });
});
