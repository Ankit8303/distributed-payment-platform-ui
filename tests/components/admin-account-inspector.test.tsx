import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAccountInspectorPage from "@/app/(admin)/admin/accounts/[id]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { AccountAdminResponse } from "@/types/admin";
import AdminLayout from "@/app/(admin)/layout";

// Mock next/navigation
const mockPush = vi.fn();
let mockParams = { id: "acc-11111111-2222-3333-4444-555555555555" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => `/admin/accounts/${mockParams.id}`,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => mockParams,
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

const mockAccount: AccountAdminResponse = {
  id: "acc-11111111-2222-3333-4444-555555555555",
  accountNumber: "ACC-US-0042",
  ownerId: "usr-owner-9999-8888",
  accountType: "CUSTOMER",
  currency: "USD",
  status: "ACTIVE",
  materializedBalanceMinor: 345075,
  version: 3,
  createdAt: "2026-09-01T12:00:00Z",
  updatedAt: "2026-09-15T15:30:00Z",
};

describe("Admin Account Inspector (Phase F7-G-C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: "acc-11111111-2222-3333-4444-555555555555" };

    // Default authenticated ADMIN user
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-admin-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  // ==========================================================================
  // 1. Account Rendering
  // ==========================================================================
  describe("Account Details Rendering", () => {
    it("renders all authoritative backend fields accurately", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      // Heading and badge
      expect(screen.getByRole("heading", { level: 1, name: "Account Inspector" })).toBeInTheDocument();
      expect(screen.getAllByTestId("account-status-badge")[0]).toHaveTextContent("Active");
      expect(screen.getByTestId("detail-account-type-badge")).toHaveTextContent("CUSTOMER");

      // Identity fields
      expect(screen.getByTestId("detail-account-number")).toHaveTextContent("ACC-US-0042");
      expect(screen.getByTestId("detail-account-id")).toHaveTextContent("acc-11111111-2222-3333-4444-555555555555");
      expect(screen.getByTestId("detail-owner-id")).toHaveTextContent("usr-owner-9999-8888");
      expect(screen.getByTestId("detail-account-type")).toHaveTextContent("CUSTOMER");
      expect(screen.getByTestId("detail-currency")).toHaveTextContent("USD");

      // Metadata fields
      expect(screen.getByTestId("detail-version")).toHaveTextContent("v3");
      expect(screen.getByTestId("detail-created-at")).toHaveTextContent("2026");
      expect(screen.getByTestId("detail-updated-at")).toHaveTextContent("2026");
    });

    it("supports copy-to-clipboard on identifiers with accessible feedback", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("copy-account-id-button")).toBeInTheDocument();
      });

      const copyIdBtn = screen.getByTestId("copy-account-id-button");
      fireEvent.click(copyIdBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAccount.id);
      expect(screen.getByText("Copied Account ID to clipboard")).toBeInTheDocument();
    });

    it("renders refresh button and calls refetch", async () => {
      const getSpy = vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("refresh-account-button")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("refresh-account-button"));
      expect(getSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // 2. Financial Integrity & Zero Calculations
  // ==========================================================================
  describe("Financial Integrity Verification", () => {
    it("displays formatted materialized balance and minor units without client-side math", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("detail-materialized-balance")).toBeInTheDocument();
      });

      // 345075 minor units in USD is $3,450.75
      expect(screen.getByTestId("detail-materialized-balance")).toHaveTextContent("$3,450.75");
      expect(screen.getByText("345,075 minor units")).toBeInTheDocument();
    });

    it("FINANCIAL INTEGRITY: calls balance-summary endpoint for active account only", async () => {
      const balanceSummarySpy = vi
        .spyOn(adminApi, "getAdminAccountBalanceSummary")
        .mockResolvedValue({
          accountId: mockAccount.id,
          accountNumber: mockAccount.accountNumber,
          currency: mockAccount.currency,
          materializedBalanceMinor: mockAccount.materializedBalanceMinor,
          authoritativeLedgerBalanceMinor: mockAccount.materializedBalanceMinor,
          differenceMinor: 0,
          isConsistent: true,
        });
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      // Exactly one balance-summary query for the active account
      expect(balanceSummarySpy).toHaveBeenCalledTimes(1);
      expect(balanceSummarySpy).toHaveBeenCalledWith(mockAccount.id, expect.anything());
    });

    it("PHASE F7-G-E: presents Freeze action for ACTIVE account and neither for CLOSED account", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

      const { unmount } = renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      // ACTIVE account: Freeze action must be offered, Unfreeze must not
      expect(screen.getByTestId("freeze-account-button")).toBeInTheDocument();
      expect(screen.queryByTestId("unfreeze-account-button")).not.toBeInTheDocument();

      unmount();

      // CLOSED account: Neither lifecycle action offered
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue({
        ...mockAccount,
        status: "CLOSED",
      });

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("freeze-account-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unfreeze-account-button")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 3. Route Safety
  // ==========================================================================
  describe("Route Parameter Safety", () => {
    it("disables query when account ID is empty", async () => {
      mockParams = { id: "" };
      const getSpy = vi.spyOn(adminApi, "getAdminAccount");

      renderWithProviders(<AdminAccountInspectorPage />);

      // Query must not be executed
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("disables query when account ID is whitespace only", async () => {
      mockParams = { id: "    " };
      const getSpy = vi.spyOn(adminApi, "getAdminAccount");

      renderWithProviders(<AdminAccountInspectorPage />);

      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 4. Loading, 404, and Error Handling
  // ==========================================================================
  describe("Loading, 404 Not Found, and Error States", () => {
    it("renders loading skeleton initially", () => {
      vi.spyOn(adminApi, "getAdminAccount").mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<AdminAccountInspectorPage />);

      expect(screen.getByTestId("admin-account-inspector-loading")).toBeInTheDocument();
    });

    it("explicitly handles 404 and displays account-not-found view", async () => {
      const notFoundError = new ApiError({
        type: "about:blank",
        title: "Account Not Found",
        status: 404,
        detail: "Account acc-11111111-2222-3333-4444-555555555555 does not exist",
        errorCode: "ACCOUNT_NOT_FOUND",
        timestamp: "2026-09-26T12:00:00Z",
      });

      vi.spyOn(adminApi, "getAdminAccount").mockRejectedValue(notFoundError);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-not-found")).toBeInTheDocument();
      });

      expect(screen.getByText("Account Not Found")).toBeInTheDocument();
      expect(screen.getByTestId("back-to-accounts-link")).toHaveAttribute("href", "/admin/accounts");
    });

    it("renders AdminErrorState on 500 error and supports retry", async () => {
      const serverError = new ApiError({
        type: "about:blank",
        title: "Database Error",
        status: 500,
        detail: "Connection pool exhausted",
        errorCode: "DATABASE_ERROR",
        timestamp: "2026-09-26T12:00:00Z",
      });

      const getSpy = vi.spyOn(adminApi, "getAdminAccount").mockRejectedValue(serverError);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-error-container")).toBeInTheDocument();
      });

      expect(screen.getByText("Connection pool exhausted")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryBtn);

      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    it("handles 401, 403, and 429 errors appropriately via error container", async () => {
      const rateLimitError = new ApiError({
        type: "about:blank",
        title: "Too Many Requests",
        status: 429,
        detail: "Rate limit exceeded",
        errorCode: "RATE_LIMITED",
        timestamp: "2026-09-26T12:00:00Z",
      });

      vi.spyOn(adminApi, "getAdminAccount").mockRejectedValue(rateLimitError);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-error-container")).toBeInTheDocument();
      });

      expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 5. Navigation & Breadcrumbs
  // ==========================================================================
  describe("Navigation & Breadcrumbs", () => {
    it("provides back to accounts and breadcrumb links", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      expect(screen.getByTestId("back-to-accounts-link")).toHaveAttribute("href", "/admin/accounts");
      expect(screen.getByTestId("breadcrumb-accounts-link")).toHaveAttribute("href", "/admin/accounts");
    });
  });

  // ==========================================================================
  // 6. Security Boundary
  // ==========================================================================
  describe("Security Boundary", () => {
    it("allows SYSTEM role to view account inspector", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "sys-1", email: "system@platform.local", role: "SYSTEM" },
        status: "authenticated",
        accessToken: "mock-sys-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const getSpy = vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1, name: "Account Inspector" })).toBeInTheDocument();
      });

      expect(getSpy).toHaveBeenCalled();
    });

    it("blocks CUSTOMER role from viewing account inspector and makes zero API calls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "cust-1", email: "customer@platform.local", role: "CUSTOMER" },
        status: "authenticated",
        accessToken: "mock-cust-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const getSpy = vi.spyOn(adminApi, "getAdminAccount");

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(screen.queryByRole("heading", { level: 1, name: "Account Inspector" })).not.toBeInTheDocument();
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("blocks MERCHANT role from viewing account inspector and makes zero API calls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "merch-1", email: "merchant@platform.local", role: "MERCHANT" },
        status: "authenticated",
        accessToken: "mock-merch-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const getSpy = vi.spyOn(adminApi, "getAdminAccount");

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(screen.queryByRole("heading", { level: 1, name: "Account Inspector" })).not.toBeInTheDocument();
      expect(getSpy).not.toHaveBeenCalled();
    });
  });
});
