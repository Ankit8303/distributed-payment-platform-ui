import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useAdminUsers,
  normalizeUserQueryParams,
} from "@/features/admin/hooks/use-admin-users";
import { useAdminUser } from "@/features/admin/hooks/use-admin-user";
import {
  useAdminNotifications,
  normalizeNotificationQueryParams,
} from "@/features/admin/hooks/use-admin-notifications";
import { useAdminNotification } from "@/features/admin/hooks/use-admin-notification";
import {
  useRetryAdminNotification,
  useRunAdminNotificationWorker,
} from "@/features/admin/hooks/use-admin-notification-mutations";
import {
  useAdminRefunds,
  normalizeRefundQueryParams,
} from "@/features/admin/hooks/use-admin-refunds";
import { useAdminRefund } from "@/features/admin/hooks/use-admin-refund";
import {
  useAdminPayouts,
  normalizePayoutQueryParams,
} from "@/features/admin/hooks/use-admin-payouts";
import { useAdminPayout } from "@/features/admin/hooks/use-admin-payout";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import type {
  Page,
  UserAdminResponse,
  NotificationEntity,
  NotificationDetailResponse,
  RefundAdminResponse,
  PayoutAdminResponse,
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

describe("Phase F8-D Admin Governance Hooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Query Parameter Normalizers", () => {
    it("normalizes user query params correctly", () => {
      expect(normalizeUserQueryParams(undefined)).toBeUndefined();
      expect(
        normalizeUserQueryParams({
          page: 2,
          size: 25,
          sort: "createdAt,desc",
          role: "ADMIN",
          status: "ACTIVE",
          email: "  admin@test.com  ",
        })
      ).toEqual({
        page: 2,
        size: 25,
        sort: "createdAt,desc",
        role: "ADMIN",
        status: "ACTIVE",
        email: "admin@test.com",
      });
    });

    it("normalizes notification query params correctly", () => {
      expect(normalizeNotificationQueryParams(undefined)).toBeUndefined();
      expect(
        normalizeNotificationQueryParams({
          page: 0,
          size: 50,
          sort: "createdAt,desc",
          status: "FAILED",
        })
      ).toEqual({
        page: 0,
        size: 50,
        sort: "createdAt,desc",
        status: "FAILED",
      });
    });

    it("normalizes refund query params correctly", () => {
      expect(normalizeRefundQueryParams(undefined)).toBeUndefined();
      expect(
        normalizeRefundQueryParams({
          page: 1,
          size: 10,
          sort: "createdAt,desc",
          paymentId: "  pay-uuid-1  ",
          status: "SETTLED",
        })
      ).toEqual({
        page: 1,
        size: 10,
        sort: "createdAt,desc",
        paymentId: "pay-uuid-1",
        status: "SETTLED",
      });
    });

    it("normalizes payout query params correctly", () => {
      expect(normalizePayoutQueryParams(undefined)).toBeUndefined();
      expect(
        normalizePayoutQueryParams({
          page: 0,
          size: 20,
          sort: "createdAt,desc",
          accountId: "  acc-uuid-1  ",
          status: "PROCESSING",
        })
      ).toEqual({
        page: 0,
        size: 20,
        sort: "createdAt,desc",
        accountId: "acc-uuid-1",
        status: "PROCESSING",
      });
    });
  });

  describe("User Governance Hooks", () => {
    it("fetches paginated users via useAdminUsers", async () => {
      const mockPage: Page<UserAdminResponse> = {
        content: [
          {
            id: "user-1",
            email: "admin@test.com",
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

      const { result } = renderHook(() => useAdminUsers({ page: 0, size: 20 }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.content).toHaveLength(1);
      expect(result.current.data?.content?.[0]?.email).toBe("admin@test.com");
      expect(adminApi.getAdminUsers).toHaveBeenCalledWith({
        page: 0,
        size: 20,
      });
    });

    it("fetches single user details via useAdminUser", async () => {
      const mockUser: UserAdminResponse = {
        id: "user-123",
        email: "system@platform.local",
        role: "SYSTEM",
        status: "ACTIVE",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      vi.spyOn(adminApi, "getAdminUser").mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAdminUser("user-123"), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe("user-123");
      expect(result.current.data?.role).toBe("SYSTEM");
      expect(adminApi.getAdminUser).toHaveBeenCalledWith("user-123");
    });
  });

  describe("Admin Notification Hooks", () => {
    it("fetches paginated notifications via useAdminNotifications", async () => {
      const mockPage: Page<NotificationEntity> = {
        content: [
          {
            id: "notif-1",
            eventId: "event-1",
            eventType: "PAYMENT_SETTLED",
            aggregateId: "pay-1",
            recipient: "customer@example.com",
            channel: "EMAIL",
            templateCode: "PAYMENT_CONFIRM",
            templateVersion: 1,
            status: "SENT",
            attemptCount: 1,
            maxAttempts: 3,
            nextAttemptAt: null,
            leaseWorkerId: null,
            leaseExpiresAt: null,
            renderedSubject: "Payment Confirmed",
            renderedBody: "Your payment has settled.",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
            sentAt: "2026-01-01T00:01:00Z",
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

      const { result } = renderHook(() => useAdminNotifications({ status: "SENT" }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.content).toHaveLength(1);
      expect(result.current.data?.content?.[0]?.channel).toBe("EMAIL");
    });

    it("fetches notification detail via useAdminNotification", async () => {
      const mockDetail: NotificationDetailResponse = {
        notification: {
          id: "notif-1",
          eventId: "event-1",
          eventType: "PAYMENT_FAILED",
          aggregateId: "pay-1",
          recipient: "+1234567890",
          channel: "SMS",
          templateCode: "PAYMENT_ALERT",
          templateVersion: 1,
          status: "FAILED",
          attemptCount: 2,
          maxAttempts: 3,
          nextAttemptAt: "2026-01-01T01:00:00Z",
          leaseWorkerId: null,
          leaseExpiresAt: null,
          renderedSubject: null,
          renderedBody: "Payment failed due to provider error.",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:05:00Z",
          sentAt: null,
        },
        deliveries: [
          {
            id: "del-1",
            notificationId: "notif-1",
            attemptNumber: 1,
            workerId: "worker-1",
            channel: "SMS",
            status: "FAILED",
            providerStatus: "GATEWAY_TIMEOUT",
            httpStatusCode: 504,
            errorMessage: "Connection timed out",
            createdAt: "2026-01-01T00:01:00Z",
          },
        ],
      };

      vi.spyOn(adminApi, "getAdminNotification").mockResolvedValue(mockDetail);

      const { result } = renderHook(() => useAdminNotification("notif-1"), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.notification.id).toBe("notif-1");
      expect(result.current.data?.deliveries).toHaveLength(1);
    });

    it("executes retry mutation with retry: false", async () => {
      const mockUpdated: NotificationEntity = {
        id: "notif-1",
        eventId: "event-1",
        eventType: "PAYMENT_FAILED",
        aggregateId: "pay-1",
        recipient: "+1234567890",
        channel: "SMS",
        templateCode: "PAYMENT_ALERT",
        templateVersion: 1,
        status: "PENDING",
        attemptCount: 2,
        maxAttempts: 3,
        nextAttemptAt: "2026-01-01T01:00:00Z",
        leaseWorkerId: null,
        leaseExpiresAt: null,
        renderedSubject: null,
        renderedBody: "Payment failed.",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:10:00Z",
        sentAt: null,
      };

      vi.spyOn(adminApi, "retryAdminNotification").mockResolvedValue(mockUpdated);

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useRetryAdminNotification("notif-1", { onSuccess }),
        { wrapper: createTestWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(adminApi.retryAdminNotification).toHaveBeenCalledWith("notif-1");
      expect(onSuccess).toHaveBeenCalledWith(mockUpdated);
    });

    it("executes notification worker sweep mutation with retry: false", async () => {
      vi.spyOn(adminApi, "runAdminNotificationWorker").mockResolvedValue(15);

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useRunAdminNotificationWorker({ onSuccess }),
        { wrapper: createTestWrapper() }
      );

      result.current.mutate({ limit: 50 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(adminApi.runAdminNotificationWorker).toHaveBeenCalledWith({ limit: 50 });
      expect(onSuccess).toHaveBeenCalledWith(15);
    });
  });

  describe("Admin Refund Hooks", () => {
    it("fetches paginated refunds via useAdminRefunds", async () => {
      const mockPage: Page<RefundAdminResponse> = {
        content: [
          {
            id: "ref-1",
            paymentId: "pay-1",
            amountMinor: 5000,
            currency: "USD",
            status: "SETTLED",
            reason: "Customer requested return",
            providerReference: "ch_ref_123",
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

      vi.spyOn(adminApi, "getAdminRefunds").mockResolvedValue(mockPage);

      const { result } = renderHook(() => useAdminRefunds({ paymentId: "pay-1" }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.content).toHaveLength(1);
      expect(result.current.data?.content?.[0]?.amountMinor).toBe(5000);
      expect(result.current.data?.content?.[0]?.currency).toBe("USD");
    });

    it("fetches single refund by id via useAdminRefund", async () => {
      const mockRefund: RefundAdminResponse = {
        id: "ref-1",
        paymentId: "pay-1",
        amountMinor: 1250,
        currency: "EUR",
        status: "PROCESSING",
        reason: "Item returned",
        providerReference: "prov-ref-456",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      vi.spyOn(adminApi, "getAdminRefund").mockResolvedValue(mockRefund);

      const { result } = renderHook(() => useAdminRefund("ref-1"), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe("ref-1");
      expect(result.current.data?.amountMinor).toBe(1250);
      expect(result.current.data?.currency).toBe("EUR");
    });
  });

  describe("Admin Payout Hooks", () => {
    it("fetches paginated payouts via useAdminPayouts", async () => {
      const mockPage: Page<PayoutAdminResponse> = {
        content: [
          {
            id: "payout-1",
            accountId: "acc-1",
            amountMinor: 150000,
            currency: "USD",
            status: "SETTLED",
            providerReference: "po_bank_789",
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

      vi.spyOn(adminApi, "getAdminPayouts").mockResolvedValue(mockPage);

      const { result } = renderHook(() => useAdminPayouts({ accountId: "acc-1" }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.content).toHaveLength(1);
      expect(result.current.data?.content?.[0]?.amountMinor).toBe(150000);
    });

    it("fetches single payout by id via useAdminPayout", async () => {
      const mockPayout: PayoutAdminResponse = {
        id: "payout-1",
        accountId: "acc-1",
        amountMinor: 85000,
        currency: "USD",
        status: "REQUESTED",
        providerReference: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      vi.spyOn(adminApi, "getAdminPayout").mockResolvedValue(mockPayout);

      const { result } = renderHook(() => useAdminPayout("payout-1"), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe("payout-1");
      expect(result.current.data?.amountMinor).toBe(85000);
      expect(result.current.data?.status).toBe("REQUESTED");
    });
  });
});
