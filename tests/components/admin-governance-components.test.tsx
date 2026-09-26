import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  UserStatusBadge,
  UserRoleBadge,
} from "@/features/admin/components/user-status-badge";
import {
  NotificationStatusBadge,
  NotificationChannelBadge,
} from "@/features/admin/components/notification-status-badge";
import { AdminRefundStatusBadge } from "@/features/admin/components/refund-status-badge";
import { AdminPayoutStatusBadge } from "@/features/admin/components/payout-status-badge";
import { UserFilters } from "@/features/admin/components/user-filters";
import { NotificationFilters } from "@/features/admin/components/notification-filters";
import { RefundFilters } from "@/features/admin/components/refund-filters";
import { PayoutFilters } from "@/features/admin/components/payout-filters";
import { UserTable } from "@/features/admin/components/user-table";
import { NotificationTable } from "@/features/admin/components/notification-table";
import { RefundTable } from "@/features/admin/components/refund-table";
import { PayoutTable } from "@/features/admin/components/payout-table";
import { NotificationActionModal } from "@/features/admin/components/notification-action-modal";
import type {
  UserAdminResponse,
  NotificationAdminResponse,
  RefundAdminResponse,
  PayoutAdminResponse,
} from "@/types/admin";

describe("Phase F8-D Admin Governance Components", () => {
  describe("Badges", () => {
    it("renders UserStatusBadge for all statuses", () => {
      const { rerender } = render(<UserStatusBadge status="ACTIVE" />);
      expect(screen.getByText("Active")).toBeInTheDocument();

      rerender(<UserStatusBadge status="SUSPENDED" />);
      expect(screen.getByText("Suspended")).toBeInTheDocument();

      rerender(<UserStatusBadge status="LOCKED" />);
      expect(screen.getByText("Locked")).toBeInTheDocument();

      rerender(<UserStatusBadge status="DELETED" />);
      expect(screen.getByText("Deleted")).toBeInTheDocument();
    });

    it("renders UserRoleBadge correctly", () => {
      const { rerender } = render(<UserRoleBadge role="ADMIN" />);
      expect(screen.getByText("Admin")).toBeInTheDocument();

      rerender(<UserRoleBadge role="SYSTEM" />);
      expect(screen.getByText("System")).toBeInTheDocument();

      rerender(<UserRoleBadge role="MERCHANT" />);
      expect(screen.getByText("Merchant")).toBeInTheDocument();

      rerender(<UserRoleBadge role="CUSTOMER" />);
      expect(screen.getByText("Customer")).toBeInTheDocument();
    });

    it("renders NotificationStatusBadge correctly", () => {
      const { rerender } = render(<NotificationStatusBadge status="SENT" />);
      expect(screen.getByText("Sent")).toBeInTheDocument();

      rerender(<NotificationStatusBadge status="PENDING" />);
      expect(screen.getByText("Pending")).toBeInTheDocument();

      rerender(<NotificationStatusBadge status="FAILED" />);
      expect(screen.getByText("Failed")).toBeInTheDocument();

      rerender(<NotificationStatusBadge status="PROCESSING" />);
      expect(screen.getByText("Processing")).toBeInTheDocument();
    });

    it("renders NotificationChannelBadge correctly", () => {
      const { rerender } = render(<NotificationChannelBadge channel="EMAIL" />);
      expect(screen.getByText("Email")).toBeInTheDocument();

      rerender(<NotificationChannelBadge channel="SMS" />);
      expect(screen.getByText("SMS")).toBeInTheDocument();

      rerender(<NotificationChannelBadge channel="WEBHOOK" />);
      expect(screen.getByText("Webhook")).toBeInTheDocument();
    });

    it("renders AdminRefundStatusBadge correctly", () => {
      const { rerender } = render(<AdminRefundStatusBadge status="SETTLED" />);
      expect(screen.getByText("Settled")).toBeInTheDocument();

      rerender(<AdminRefundStatusBadge status="PROCESSING" />);
      expect(screen.getByText("Processing")).toBeInTheDocument();

      rerender(<AdminRefundStatusBadge status="FAILED" />);
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("renders AdminPayoutStatusBadge correctly", () => {
      const { rerender } = render(<AdminPayoutStatusBadge status="SETTLED" />);
      expect(screen.getByText("Settled")).toBeInTheDocument();

      rerender(<AdminPayoutStatusBadge status="REQUESTED" />);
      expect(screen.getByText("Requested")).toBeInTheDocument();

      rerender(<AdminPayoutStatusBadge status="FAILED" />);
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });

  describe("Filter Forms", () => {
    it("handles UserFilters apply and reset", () => {
      const onApply = vi.fn();
      const onReset = vi.fn();

      render(
        <UserFilters
          initialFilters={{ role: "CUSTOMER", status: "ACTIVE" }}
          onApplyFilters={onApply}
          onResetFilters={onReset}
        />
      );

      const emailInput = screen.getByTestId("user-email-filter");
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });

      const submitBtn = screen.getByTestId("user-apply-filters-button");
      fireEvent.click(submitBtn);

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
          role: "CUSTOMER",
          status: "ACTIVE",
          page: 0,
        })
      );

      const resetBtn = screen.getByTestId("user-reset-filters-button");
      fireEvent.click(resetBtn);
      expect(onReset).toHaveBeenCalled();
    });

    it("handles NotificationFilters apply and reset", () => {
      const onApply = vi.fn();
      const onReset = vi.fn();

      render(
        <NotificationFilters
          initialFilters={{ status: "FAILED" }}
          onApplyFilters={onApply}
          onResetFilters={onReset}
        />
      );

      const statusSelect = screen.getByTestId("notification-status-filter");
      fireEvent.change(statusSelect, { target: { value: "SENT" } });

      const submitBtn = screen.getByTestId("notification-apply-filters-button");
      fireEvent.click(submitBtn);

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "SENT",
          page: 0,
        })
      );

      const resetBtn = screen.getByTestId("notification-reset-filters-button");
      fireEvent.click(resetBtn);
      expect(onReset).toHaveBeenCalled();
    });

    it("handles RefundFilters apply and reset", () => {
      const onApply = vi.fn();
      const onReset = vi.fn();

      render(
        <RefundFilters
          initialFilters={{}}
          onApplyFilters={onApply}
          onResetFilters={onReset}
        />
      );

      const paymentInput = screen.getByTestId("refund-payment-id-filter");
      fireEvent.change(paymentInput, { target: { value: "pay-123" } });

      const statusSelect = screen.getByTestId("refund-status-filter");
      fireEvent.change(statusSelect, { target: { value: "SETTLED" } });

      const submitBtn = screen.getByTestId("refund-apply-filters-button");
      fireEvent.click(submitBtn);

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: "pay-123",
          status: "SETTLED",
          page: 0,
        })
      );
    });

    it("handles PayoutFilters apply and reset", () => {
      const onApply = vi.fn();
      const onReset = vi.fn();

      render(
        <PayoutFilters
          initialFilters={{}}
          onApplyFilters={onApply}
          onResetFilters={onReset}
        />
      );

      const accInput = screen.getByTestId("payout-account-id-filter");
      fireEvent.change(accInput, { target: { value: "acc-456" } });

      const statusSelect = screen.getByTestId("payout-status-filter");
      fireEvent.change(statusSelect, { target: { value: "PROCESSING" } });

      const submitBtn = screen.getByTestId("payout-apply-filters-button");
      fireEvent.click(submitBtn);

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: "acc-456",
          status: "PROCESSING",
          page: 0,
        })
      );
    });
  });

  describe("Tables", () => {
    it("renders UserTable loading skeleton, empty, and populated", () => {
      const { rerender } = render(<UserTable users={[]} isLoading={true} />);
      expect(screen.getByTestId("user-table-skeleton")).toBeInTheDocument();

      rerender(<UserTable users={[]} isLoading={false} />);
      expect(screen.getByTestId("user-table-empty")).toBeInTheDocument();

      const mockUsers: UserAdminResponse[] = [
        {
          id: "u-11111111-1111-1111-1111-111111111111",
          email: "admin@corp.internal",
          role: "ADMIN",
          status: "ACTIVE",
          createdAt: "2026-02-01T12:00:00Z",
          updatedAt: "2026-02-01T12:00:00Z",
        },
      ];

      rerender(<UserTable users={mockUsers} isLoading={false} />);
      expect(screen.getByTestId("user-directory-table")).toBeInTheDocument();
      expect(screen.getByText("admin@corp.internal")).toBeInTheDocument();
      expect(screen.getByTestId("view-user-u-11111111-1111-1111-1111-111111111111-link")).toBeInTheDocument();
    });

    it("renders NotificationTable loading, empty, and populated", () => {
      const { rerender } = render(<NotificationTable notifications={[]} isLoading={true} />);
      expect(screen.getByTestId("notification-table-skeleton")).toBeInTheDocument();

      rerender(<NotificationTable notifications={[]} isLoading={false} />);
      expect(screen.getByTestId("notification-table-empty")).toBeInTheDocument();

      const mockNotifs: NotificationAdminResponse[] = [
        {
          id: "notif-99999999-9999-9999-9999-999999999999",
          eventId: "event-1",
          eventType: "PAYOUT_SETTLED",
          aggregateId: "payout-1",
          recipient: "user@example.com",
          channel: "EMAIL",
          templateCode: "PAYOUT_NOTICE",
          templateVersion: 1,
          status: "SENT",
          attemptCount: 1,
          maxAttempts: 3,
          nextAttemptAt: null,
          leaseWorkerId: null,
          leaseExpiresAt: null,
          renderedSubject: "Payout Sent",
          renderedBody: "Disbursement completed.",
          createdAt: "2026-02-01T12:00:00Z",
          updatedAt: "2026-02-01T12:00:00Z",
          sentAt: "2026-02-01T12:01:00Z",
        },
      ];

      rerender(<NotificationTable notifications={mockNotifs} isLoading={false} />);
      expect(screen.getByTestId("notification-directory-table")).toBeInTheDocument();
      expect(screen.getByText("PAYOUT_SETTLED")).toBeInTheDocument();
      expect(screen.getByTestId("view-notification-notif-99999999-9999-9999-9999-999999999999-link")).toBeInTheDocument();
    });

    it("renders RefundTable loading, empty, and populated with formatted money", () => {
      const { rerender } = render(<RefundTable refunds={[]} isLoading={true} />);
      expect(screen.getByTestId("refund-table-skeleton")).toBeInTheDocument();

      rerender(<RefundTable refunds={[]} isLoading={false} />);
      expect(screen.getByTestId("refund-table-empty")).toBeInTheDocument();

      const mockRefunds: RefundAdminResponse[] = [
        {
          id: "ref-11111111-1111-1111-1111-111111111111",
          paymentId: "pay-22222222-2222-2222-2222-222222222222",
          amountMinor: 4999,
          currency: "USD",
          status: "SETTLED",
          reason: "Returned goods",
          providerReference: "re_stripe_123",
          createdAt: "2026-02-01T12:00:00Z",
          updatedAt: "2026-02-01T12:00:00Z",
        },
      ];

      rerender(<RefundTable refunds={mockRefunds} isLoading={false} />);
      expect(screen.getByTestId("admin-refunds-table")).toBeInTheDocument();
      expect(screen.getByText("$49.99")).toBeInTheDocument();
      expect(screen.getByText("re_stripe_123")).toBeInTheDocument();
    });

    it("renders PayoutTable loading, empty, and populated with formatted money", () => {
      const { rerender } = render(<PayoutTable payouts={[]} isLoading={true} />);
      expect(screen.getByTestId("payout-table-skeleton")).toBeInTheDocument();

      rerender(<PayoutTable payouts={[]} isLoading={false} />);
      expect(screen.getByTestId("payout-table-empty")).toBeInTheDocument();

      const mockPayouts: PayoutAdminResponse[] = [
        {
          id: "po-11111111-1111-1111-1111-111111111111",
          accountId: "acc-33333333-3333-3333-3333-333333333333",
          amountMinor: 250000,
          currency: "USD",
          status: "SETTLED",
          providerReference: "po_bank_ref_77",
          createdAt: "2026-02-01T12:00:00Z",
          updatedAt: "2026-02-01T12:00:00Z",
        },
      ];

      rerender(<PayoutTable payouts={mockPayouts} isLoading={false} />);
      expect(screen.getByTestId("admin-payouts-table")).toBeInTheDocument();
      expect(screen.getByText("$2,500.00")).toBeInTheDocument();
      expect(screen.getByText("po_bank_ref_77")).toBeInTheDocument();
    });
  });

  describe("Notification Action Modal", () => {
    it("renders when open and responds to user interaction", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      const { rerender } = render(
        <NotificationActionModal
          isOpen={false}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Run Worker"
          description="Process outbox queue"
          actionLabel="Execute Sweep"
          consequence="Dispatches pending records"
          isPending={false}
        />
      );

      expect(screen.queryByTestId("notification-action-modal")).not.toBeInTheDocument();

      rerender(
        <NotificationActionModal
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Run Worker"
          description="Process outbox queue"
          actionLabel="Execute Sweep"
          consequence="Dispatches pending records"
          isPending={false}
        />
      );

      expect(screen.getByTestId("notification-action-modal")).toBeInTheDocument();
      expect(screen.getByText("Run Worker")).toBeInTheDocument();
      expect(screen.getByText("Process outbox queue")).toBeInTheDocument();
      expect(screen.getByText("Dispatches pending records")).toBeInTheDocument();

      // Cancel click
      fireEvent.click(screen.getByTestId("notification-modal-cancel-button"));
      expect(onClose).toHaveBeenCalled();

      // Confirm click
      fireEvent.click(screen.getByTestId("notification-modal-confirm-button"));
      expect(onConfirm).toHaveBeenCalled();
    });
  });
});
