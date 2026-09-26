import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UserGovernancePage from "@/app/(admin)/admin/users/page";
import UserDetailPage from "@/app/(admin)/admin/users/[userId]/page";
import NotificationsPage from "@/app/(admin)/admin/notifications/page";
import NotificationDetailPage from "@/app/(admin)/admin/notifications/[id]/page";
import AdminRefundsPage from "@/app/(admin)/admin/refunds/page";
import AdminRefundDetailPage from "@/app/(admin)/admin/refunds/[id]/page";
import AdminPayoutsPage from "@/app/(admin)/admin/payouts/page";
import AdminPayoutDetailPage from "@/app/(admin)/admin/payouts/[id]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import type {
  Page,
  UserAdminResponse,
  NotificationAdminResponse,
  NotificationDetailResponse,
  RefundAdminResponse,
  PayoutAdminResponse,
} from "@/types/admin";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin",
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

describe("Phase F8-D Admin Governance Pages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("User Governance Pages", () => {
    it("renders User Directory page and lists users", async () => {
      const mockPage: Page<UserAdminResponse> = {
        content: [
          {
            id: "u-100",
            email: "ops-lead@bank.internal",
            role: "ADMIN",
            status: "ACTIVE",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        empty: false,
        numberOfElements: 1,
        pageable: {
          pageNumber: 0,
          pageSize: 20,
          offset: 0,
          paged: true,
          unpaged: false,
          sort: { sorted: true, unsorted: false, empty: false },
        },
        sort: { sorted: true, unsorted: false, empty: false },
      };

      vi.spyOn(adminApi, "getAdminUsers").mockResolvedValue(mockPage);

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <UserGovernancePage />
        </React.Suspense>,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-governance-heading")).toBeInTheDocument();
        expect(screen.getByText("ops-lead@bank.internal")).toBeInTheDocument();
      });
    });

    it("renders User Detail page with role, status, and identity", async () => {
      const mockUser: UserAdminResponse = {
        id: "u-200",
        email: "merchant-admin@store.com",
        role: "MERCHANT",
        status: "ACTIVE",
        createdAt: "2026-01-15T10:30:00Z",
        updatedAt: "2026-01-15T10:30:00Z",
      };

      vi.spyOn(adminApi, "getAdminUser").mockResolvedValue(mockUser);

      const params = Promise.resolve({ userId: "u-200" });
      (params as any).status = "fulfilled";
      (params as any).value = { userId: "u-200" };

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <UserDetailPage params={params} />
        </React.Suspense>,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-detail-email")).toHaveTextContent("merchant-admin@store.com");
      });
      expect(screen.getByTestId("user-detail-id")).toHaveTextContent("u-200");
      expect(screen.getByText("Identity Profile")).toBeInTheDocument();
      expect(screen.getByText("Role & Access Governance")).toBeInTheDocument();
    });
  });

  describe("Notifications Pages", () => {
    it("renders Notifications Directory and handles run worker action", async () => {
      const mockPage: Page<NotificationAdminResponse> = {
        content: [
          {
            id: "notif-100",
            eventId: "ev-100",
            eventType: "PAYMENT_SETTLED",
            aggregateId: "agg-100",
            recipient: "user@example.com",
            channel: "EMAIL",
            templateCode: "RECEIPT",
            templateVersion: 1,
            status: "SENT",
            attemptCount: 1,
            maxAttempts: 3,
            nextAttemptAt: null,
            leaseWorkerId: null,
            leaseExpiresAt: null,
            renderedSubject: "Your Receipt",
            renderedBody: "Payment was processed.",
            createdAt: "2026-02-01T00:00:00Z",
            updatedAt: "2026-02-01T00:00:00Z",
            sentAt: "2026-02-01T00:01:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        empty: false,
        numberOfElements: 1,
        pageable: {
          pageNumber: 0,
          pageSize: 20,
          offset: 0,
          paged: true,
          unpaged: false,
          sort: { sorted: true, unsorted: false, empty: false },
        },
        sort: { sorted: true, unsorted: false, empty: false },
      };

      vi.spyOn(adminApi, "getAdminNotifications").mockResolvedValue(mockPage);
      const workerSpy = vi.spyOn(adminApi, "runAdminNotificationWorker").mockResolvedValue(4);

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <NotificationsPage />
        </React.Suspense>,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("notifications-heading")).toBeInTheDocument();
        expect(screen.getByText("PAYMENT_SETTLED")).toBeInTheDocument();
      });

      // Trigger run worker modal
      const runWorkerBtn = screen.getByTestId("run-notification-worker-button");
      fireEvent.click(runWorkerBtn);

      expect(screen.getByTestId("notification-action-modal")).toBeInTheDocument();
      const confirmBtn = screen.getByTestId("notification-modal-confirm-button");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(workerSpy).toHaveBeenCalledWith({ limit: 50 });
      });
    });

    it("renders Notification Detail and handles retry delivery action", async () => {
      const mockDetail: NotificationDetailResponse = {
        notification: {
          id: "notif-200",
          eventId: "ev-200",
          eventType: "PAYMENT_FAILED",
          aggregateId: "agg-200",
          recipient: "+19876543210",
          channel: "SMS",
          templateCode: "SMS_ALERT",
          templateVersion: 1,
          status: "FAILED",
          attemptCount: 2,
          maxAttempts: 3,
          nextAttemptAt: "2026-02-01T01:00:00Z",
          leaseWorkerId: null,
          leaseExpiresAt: null,
          renderedSubject: null,
          renderedBody: "Your payment attempt failed.",
          createdAt: "2026-02-01T00:00:00Z",
          updatedAt: "2026-02-01T00:05:00Z",
          sentAt: null,
        },
        deliveries: [
          {
            id: "del-10",
            notificationId: "notif-200",
            attemptNumber: 1,
            workerId: "w-1",
            channel: "SMS",
            status: "FAILED",
            providerStatus: "TIMEOUT",
            httpStatusCode: 504,
            errorMessage: "Carrier timeout",
            createdAt: "2026-02-01T00:01:00Z",
          },
        ],
      };

      vi.spyOn(adminApi, "getAdminNotification").mockResolvedValue(mockDetail);
      const retrySpy = vi.spyOn(adminApi, "retryAdminNotification").mockResolvedValue(mockDetail.notification);

      const params = Promise.resolve({ id: "notif-200" });
      (params as any).status = "fulfilled";
      (params as any).value = { id: "notif-200" };

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <NotificationDetailPage params={params} />
        </React.Suspense>,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("notification-detail-event")).toHaveTextContent("PAYMENT_FAILED");
      });
      expect(screen.getByTestId("notification-detail-id")).toHaveTextContent("notif-200");
      expect(screen.getByText("Your payment attempt failed.")).toBeInTheDocument();
      expect(screen.getByTestId("delivery-attempts-table")).toBeInTheDocument();

      // Trigger retry
      const retryBtn = screen.getByTestId("retry-notification-button");
      fireEvent.click(retryBtn);

      expect(screen.getByTestId("notification-action-modal")).toBeInTheDocument();
      const confirmBtn = screen.getByTestId("notification-modal-confirm-button");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(retrySpy).toHaveBeenCalledWith("notif-200");
      });
    });
  });

  describe("Admin Refunds Pages", () => {
    it("renders Admin Refunds directory and displays formatted amounts", async () => {
      const mockPage: Page<RefundAdminResponse> = {
        content: [
          {
            id: "ref-100",
            paymentId: "pay-100",
            amountMinor: 8950,
            currency: "USD",
            status: "SETTLED",
            reason: "Defective item",
            providerReference: "re_test_refund_89",
            createdAt: "2026-02-01T00:00:00Z",
            updatedAt: "2026-02-01T00:00:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        empty: false,
        numberOfElements: 1,
        pageable: {
          pageNumber: 0,
          pageSize: 20,
          offset: 0,
          paged: true,
          unpaged: false,
          sort: { sorted: true, unsorted: false, empty: false },
        },
        sort: { sorted: true, unsorted: false, empty: false },
      };

      vi.spyOn(adminApi, "getAdminRefunds").mockResolvedValue(mockPage);

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <AdminRefundsPage />
        </React.Suspense>,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("admin-refunds-heading")).toBeInTheDocument();
        expect(screen.getByText("$89.50")).toBeInTheDocument();
        expect(screen.getByText("re_test_refund_89")).toBeInTheDocument();
      });
    });

    it("renders Admin Refund Detail with authoritative financial data", async () => {
      const mockRefund: RefundAdminResponse = {
        id: "ref-200",
        paymentId: "pay-200",
        amountMinor: 14999,
        currency: "USD",
        status: "SETTLED",
        reason: "Customer cancellation",
        providerReference: "ch_ref_stripe_999",
        createdAt: "2026-02-01T12:00:00Z",
        updatedAt: "2026-02-01T12:05:00Z",
      };

      vi.spyOn(adminApi, "getAdminRefund").mockResolvedValue(mockRefund);

      const params = Promise.resolve({ id: "ref-200" });
      (params as any).status = "fulfilled";
      (params as any).value = { id: "ref-200" };

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <AdminRefundDetailPage params={params} />
        </React.Suspense>,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("refund-detail-amount")).toHaveTextContent("$149.99");
      });
      expect(screen.getByTestId("refund-detail-id")).toHaveTextContent("ref-200");
      expect(screen.getByTestId("refund-payment-trace-link")).toBeInTheDocument();
      expect(screen.getByText("Authoritative Financial Data")).toBeInTheDocument();
      expect(screen.getByText("Financial Integrity Policy")).toBeInTheDocument();
    });
  });

  describe("Admin Payouts Pages", () => {
    it("renders Admin Payouts directory and displays formatted amounts", async () => {
      const mockPage: Page<PayoutAdminResponse> = {
        content: [
          {
            id: "po-100",
            accountId: "acc-100",
            amountMinor: 500000,
            currency: "USD",
            status: "SETTLED",
            providerReference: "payout_bank_wire_500",
            createdAt: "2026-02-01T00:00:00Z",
            updatedAt: "2026-02-01T00:00:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        empty: false,
        numberOfElements: 1,
        pageable: {
          pageNumber: 0,
          pageSize: 20,
          offset: 0,
          paged: true,
          unpaged: false,
          sort: { sorted: true, unsorted: false, empty: false },
        },
        sort: { sorted: true, unsorted: false, empty: false },
      };

      vi.spyOn(adminApi, "getAdminPayouts").mockResolvedValue(mockPage);

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <AdminPayoutsPage />
        </React.Suspense>,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("admin-payouts-heading")).toBeInTheDocument();
        expect(screen.getByText("$5,000.00")).toBeInTheDocument();
        expect(screen.getByText("payout_bank_wire_500")).toBeInTheDocument();
      });
    });

    it("renders Admin Payout Detail with authoritative financial data", async () => {
      const mockPayout: PayoutAdminResponse = {
        id: "po-200",
        accountId: "acc-200",
        amountMinor: 320000,
        currency: "USD",
        status: "SETTLED",
        providerReference: "wire_ach_320",
        createdAt: "2026-02-01T14:00:00Z",
        updatedAt: "2026-02-01T14:30:00Z",
      };

      vi.spyOn(adminApi, "getAdminPayout").mockResolvedValue(mockPayout);

      const params = Promise.resolve({ id: "po-200" });
      (params as any).status = "fulfilled";
      (params as any).value = { id: "po-200" };

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <AdminPayoutDetailPage params={params} />
        </React.Suspense>,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("payout-detail-amount")).toHaveTextContent("$3,200.00");
      });
      expect(screen.getByTestId("payout-detail-id")).toHaveTextContent("po-200");
      expect(screen.getByTestId("payout-account-link")).toBeInTheDocument();
      expect(screen.getByText("Authoritative Financial Data")).toBeInTheDocument();
      expect(screen.getByText("Financial Integrity Policy")).toBeInTheDocument();
    });
  });
});
