import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminDashboardPage from "@/app/(admin)/admin/dashboard/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { DashboardSummaryResponse } from "@/types/admin";
import AdminLayout from "@/app/(admin)/layout";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/admin/dashboard",
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

const mockSummaryData: DashboardSummaryResponse = {
  totalUsers: 1420,
  totalAccounts: 2850,
  activeAccounts: 2835,
  frozenAccounts: 15,
  totalPayments: 95400,
  settledPayments: 94250,
  failedPayments: 850,
  pendingReconciliationPayments: 300,
  openReconciliationCases: 4,
  totalNotifications: 112000,
};

describe("Admin Dashboard UI (Phase F7-C)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();

    // Default authenticated ADMIN user
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  describe("Metric Display & Authoritative Contract", () => {
    it("renders all 10 authoritative backend counts accurately", async () => {
      vi.spyOn(adminApi, "getAdminDashboardSummary").mockResolvedValueOnce(
        mockSummaryData
      );

      renderWithProviders(<AdminDashboardPage />);

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByTestId("kpi-total-users-value")).toHaveTextContent("1,420");
      });

      expect(screen.getByTestId("kpi-total-accounts-value")).toHaveTextContent("2,850");
      expect(screen.getByTestId("kpi-active-accounts-value")).toHaveTextContent("2,835");
      expect(screen.getByTestId("kpi-frozen-accounts-value")).toHaveTextContent("15");

      expect(screen.getByTestId("kpi-total-payments-value")).toHaveTextContent("95,400");
      expect(screen.getByTestId("kpi-settled-payments-value")).toHaveTextContent("94,250");
      expect(screen.getByTestId("kpi-failed-payments-value")).toHaveTextContent("850");
      expect(screen.getByTestId("kpi-pending-reconciliation-value")).toHaveTextContent("300");

      expect(screen.getByTestId("kpi-open-reconciliation-cases-value")).toHaveTextContent("4");
      expect(screen.getByTestId("kpi-total-notifications-value")).toHaveTextContent("112,000");
    });

    it("renders zero values as '0' rather than empty or placeholder", async () => {
      const zeroData: DashboardSummaryResponse = {
        totalUsers: 0,
        totalAccounts: 0,
        activeAccounts: 0,
        frozenAccounts: 0,
        totalPayments: 0,
        settledPayments: 0,
        failedPayments: 0,
        pendingReconciliationPayments: 0,
        openReconciliationCases: 0,
        totalNotifications: 0,
      };

      vi.spyOn(adminApi, "getAdminDashboardSummary").mockResolvedValueOnce(zeroData);

      renderWithProviders(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("kpi-total-users-value")).toHaveTextContent("0");
      });

      expect(screen.getByTestId("kpi-frozen-accounts-value")).toHaveTextContent("0");
      expect(screen.getByTestId("kpi-failed-payments-value")).toHaveTextContent("0");
      expect(screen.getByTestId("kpi-open-reconciliation-cases-value")).toHaveTextContent("0");
    });

    it("renders loading skeletons during pending request without flashing zero", () => {
      // Pending promise that never resolves during this test
      vi.spyOn(adminApi, "getAdminDashboardSummary").mockReturnValue(
        new Promise(() => {})
      );

      renderWithProviders(<AdminDashboardPage />);

      const loadingIndicators = screen.getAllByRole("status");
      expect(loadingIndicators.length).toBeGreaterThanOrEqual(10);
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
  });

  describe("Error Handling & Observability", () => {
    it("renders operational error state with correlation ID when query fails", async () => {
      const errorResponse = {
        type: "https://api.paymentledger.com/errors/INTERNAL_ERROR",
        title: "Database Cluster Unavailable",
        status: 500,
        detail: "Failed to connect to primary read replica",
        errorCode: "INTERNAL_ERROR",
        correlationId: "corr-admin-fail-9988",
        timestamp: "2026-09-26T12:00:00Z",
      };

      vi.spyOn(adminApi, "getAdminDashboardSummary").mockRejectedValue(
        new ApiError(errorResponse)
      );

      renderWithProviders(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-error-state")).toBeInTheDocument();
      });

      expect(screen.getByText("Database Cluster Unavailable")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to connect to primary read replica")
      ).toBeInTheDocument();
      expect(screen.getByTestId("admin-error-correlation-id")).toHaveTextContent(
        "Correlation ID: corr-admin-fail-9988"
      );
      expect(screen.getByTestId("admin-error-retry-button")).toBeInTheDocument();
    });

    it("allows manual retry from error state", async () => {
      const apiSpy = vi
        .spyOn(adminApi, "getAdminDashboardSummary")
        .mockRejectedValue(new Error("Network timeout"));

      renderWithProviders(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-error-state")).toBeInTheDocument();
      });

      apiSpy.mockResolvedValue(mockSummaryData);

      const retryBtn = screen.getByTestId("admin-error-retry-button");
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("kpi-total-users-value")).toHaveTextContent("1,420");
      });
    });
  });

  describe("Refresh Functionality", () => {
    it("triggers background refetch when clicking header refresh button", async () => {
      const apiSpy = vi
        .spyOn(adminApi, "getAdminDashboardSummary")
        .mockResolvedValue(mockSummaryData);

      renderWithProviders(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("kpi-total-users-value")).toHaveTextContent("1,420");
      });

      const refreshBtn = screen.getByTestId("admin-dashboard-refresh-button");
      fireEvent.click(refreshBtn);

      expect(apiSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Authorization & Security Boundary", () => {
    it("permits ADMIN role through AdminLayout to view dashboard", async () => {
      vi.spyOn(adminApi, "getAdminDashboardSummary").mockResolvedValueOnce(
        mockSummaryData
      );

      renderWithProviders(
        <AdminLayout>
          <AdminDashboardPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
      });
      expect(screen.queryByTestId("access-restricted-alert")).not.toBeInTheDocument();
    });

    it("permits SYSTEM role through AdminLayout to view dashboard", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "sys-1", email: "worker@platform.local", role: "SYSTEM" },
        status: "authenticated",
        accessToken: "mock-sys-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      vi.spyOn(adminApi, "getAdminDashboardSummary").mockResolvedValueOnce(
        mockSummaryData
      );

      renderWithProviders(
        <AdminLayout>
          <AdminDashboardPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
      });
      expect(screen.queryByTestId("access-restricted-alert")).not.toBeInTheDocument();
    });

    it("blocks CUSTOMER role from viewing dashboard and triggers no dashboard API request", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "cust-1", email: "customer@platform.local", role: "CUSTOMER" },
        status: "authenticated",
        accessToken: "mock-cust-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi.spyOn(adminApi, "getAdminDashboardSummary");

      renderWithProviders(
        <AdminLayout>
          <AdminDashboardPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(screen.queryByRole("heading", { level: 1, name: "Dashboard" })).not.toBeInTheDocument();
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it("blocks MERCHANT role from viewing dashboard and triggers no dashboard API request", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "merch-1", email: "merchant@platform.local", role: "MERCHANT" },
        status: "authenticated",
        accessToken: "mock-merch-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi.spyOn(adminApi, "getAdminDashboardSummary");

      renderWithProviders(
        <AdminLayout>
          <AdminDashboardPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(screen.queryByRole("heading", { level: 1, name: "Dashboard" })).not.toBeInTheDocument();
      expect(apiSpy).not.toHaveBeenCalled();
    });
  });
});
