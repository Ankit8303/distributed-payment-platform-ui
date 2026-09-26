import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/protected-route";
import * as authContext from "@/features/auth/auth-context";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import UserGovernancePage from "@/app/(admin)/admin/users/page";
import NotificationsPage from "@/app/(admin)/admin/notifications/page";
import AdminRefundsPage from "@/app/(admin)/admin/refunds/page";
import AdminPayoutsPage from "@/app/(admin)/admin/payouts/page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/users",
}));

describe("Phase F8-D Admin Governance Authorization & Financial Safety", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithProviders = (
    ui: React.ReactElement,
    role: "ADMIN" | "SYSTEM" | "CUSTOMER" | "MERCHANT" | null
  ) => {
    if (role) {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: `user-${role}`, email: `${role.toLowerCase()}@platform.local`, role },
        status: "authenticated",
        accessToken: `mock-${role}-token`,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });
    } else {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: null,
        status: "unauthenticated",
        accessToken: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <ProtectedRoute allowedRoles={["ADMIN", "SYSTEM"]}>
          {ui}
        </ProtectedRoute>
      </QueryClientProvider>
    );
  };

  const emptyPage = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: 20,
    number: 0,
    first: true,
    last: true,
    empty: true,
    numberOfElements: 0,
    pageable: {
      pageNumber: 0,
      pageSize: 20,
      sort: { sorted: false, unsorted: true, empty: true },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    sort: { sorted: false, unsorted: true, empty: true },
  };

  describe("Role-Based Authorization", () => {
    it("1. ADMIN is authorized and accesses user directory, triggering API", async () => {
      const getAdminUsersSpy = vi.spyOn(adminApi, "getAdminUsers").mockResolvedValue(emptyPage);

      renderWithProviders(<UserGovernancePage />, "ADMIN");

      await waitFor(() => {
        expect(screen.getByTestId("user-governance-heading")).toBeInTheDocument();
      });
      expect(getAdminUsersSpy).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("2. SYSTEM is authorized and accesses notifications, triggering API", async () => {
      const getNotificationsSpy = vi.spyOn(adminApi, "getAdminNotifications").mockResolvedValue(emptyPage);

      renderWithProviders(<NotificationsPage />, "SYSTEM");

      await waitFor(() => {
        expect(screen.getByTestId("notifications-heading")).toBeInTheDocument();
      });
      expect(getNotificationsSpy).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("3. CUSTOMER is denied access to admin governance and child queries never execute", async () => {
      const getAdminUsersSpy = vi.spyOn(adminApi, "getAdminUsers").mockResolvedValue(emptyPage);
      const getRefundsSpy = vi.spyOn(adminApi, "getAdminRefunds").mockResolvedValue(emptyPage);

      renderWithProviders(<UserGovernancePage />, "CUSTOMER");

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });
      expect(screen.getByText(/CUSTOMER/)).toBeInTheDocument();
      expect(screen.queryByTestId("user-governance-heading")).not.toBeInTheDocument();
      expect(getAdminUsersSpy).not.toHaveBeenCalled();
      expect(getRefundsSpy).not.toHaveBeenCalled();
    });

    it("4. MERCHANT is denied access to admin governance and child queries never execute", async () => {
      const getPayoutsSpy = vi.spyOn(adminApi, "getAdminPayouts").mockResolvedValue(emptyPage);

      renderWithProviders(<AdminPayoutsPage />, "MERCHANT");

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });
      expect(screen.getByText(/MERCHANT/)).toBeInTheDocument();
      expect(screen.queryByTestId("admin-payouts-heading")).not.toBeInTheDocument();
      expect(getPayoutsSpy).not.toHaveBeenCalled();
    });

    it("5. Unauthenticated user is denied and redirected to login before queries execute", async () => {
      const getRefundsSpy = vi.spyOn(adminApi, "getAdminRefunds").mockResolvedValue(emptyPage);

      renderWithProviders(<AdminRefundsPage />, null);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining("/login")
        );
      });
      expect(screen.queryByTestId("admin-refunds-heading")).not.toBeInTheDocument();
      expect(getRefundsSpy).not.toHaveBeenCalled();
    });
  });

  describe("Financial & Mutation Safety Invariants", () => {
    it("Admin refunds directory performs 0 client-side calculations and renders authoritative amount", async () => {
      const refundPage = {
        ...emptyPage,
        content: [
          {
            id: "ref-test-1",
            paymentId: "pay-test-1",
            amountMinor: 10500, // authoritative $105.00
            currency: "USD",
            status: "SETTLED" as const,
            reason: null,
            providerReference: "prov-ref-1",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        totalElements: 1,
      };

      vi.spyOn(adminApi, "getAdminRefunds").mockResolvedValue(refundPage);

      renderWithProviders(<AdminRefundsPage />, "ADMIN");

      await waitFor(() => {
        expect(screen.getByText("$105.00")).toBeInTheDocument();
      });
    });

    it("Admin payouts directory performs 0 client-side calculations and renders authoritative amount", async () => {
      const payoutPage = {
        ...emptyPage,
        content: [
          {
            id: "po-test-1",
            accountId: "acc-test-1",
            amountMinor: 250075, // authoritative $2,500.75
            currency: "USD",
            status: "SETTLED" as const,
            providerReference: "prov-ref-2",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        totalElements: 1,
      };

      vi.spyOn(adminApi, "getAdminPayouts").mockResolvedValue(payoutPage);

      renderWithProviders(<AdminPayoutsPage />, "ADMIN");

      await waitFor(() => {
        expect(screen.getByText("$2,500.75")).toBeInTheDocument();
      });
    });
  });
});
