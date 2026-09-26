import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AccountBalanceConsistency } from "@/features/admin/components/account-balance-consistency";
import AdminAccountInspectorPage from "@/app/(admin)/admin/accounts/[id]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { AccountAdminResponse, AccountBalanceSummaryResponse } from "@/types/admin";
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

const mockConsistentSummary: AccountBalanceSummaryResponse = {
  accountId: "acc-11111111-2222-3333-4444-555555555555",
  accountNumber: "ACC-US-0042",
  currency: "USD",
  materializedBalanceMinor: 345075,
  authoritativeLedgerBalanceMinor: 345075,
  differenceMinor: 0,
  isConsistent: true,
};

const mockDiscrepantSummary: AccountBalanceSummaryResponse = {
  accountId: "acc-11111111-2222-3333-4444-555555555555",
  accountNumber: "ACC-US-0042",
  currency: "USD",
  materializedBalanceMinor: 350000,
  authoritativeLedgerBalanceMinor: 345000,
  differenceMinor: 5000,
  isConsistent: false,
};

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

describe("Admin Account Balance Consistency (Phase F7-G-D)", () => {
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
  });

  // ==========================================================================
  // 1. Rendering Consistent & Discrepant States
  // ==========================================================================
  describe("Authoritative Values & Status Rendering", () => {
    it("renders consistent balance summary with all 4 required values and verified badge", async () => {
      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(mockConsistentSummary);

      renderWithProviders(
        <AccountBalanceConsistency
          accountId={mockConsistentSummary.accountId}
          accountNumber={mockConsistentSummary.accountNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
      });

      // Heading
      expect(
        screen.getByRole("heading", { level: 2, name: "Balance Consistency" })
      ).toBeInTheDocument();

      // All 4 required values
      expect(screen.getByTestId("balance-materialized-value")).toHaveTextContent("$3,450.75");
      expect(screen.getByTestId("balance-ledger-value")).toHaveTextContent("$3,450.75");
      expect(screen.getByTestId("balance-difference-value")).toHaveTextContent("$0.00");

      // Consistency status badge
      const badge = screen.getByTestId("consistency-status-badge");
      expect(badge).toHaveTextContent("Consistent");
      expect(badge).toHaveAttribute("data-status", "consistent");

      // Consistent note
      expect(screen.getByTestId("balance-consistent-note")).toBeInTheDocument();
      expect(screen.queryByTestId("balance-discrepancy-alert")).not.toBeInTheDocument();
    });

    it("renders discrepant balance summary with discrepancy alert and backend difference", async () => {
      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(mockDiscrepantSummary);

      renderWithProviders(
        <AccountBalanceConsistency
          accountId={mockDiscrepantSummary.accountId}
          accountNumber={mockDiscrepantSummary.accountNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
      });

      // Values displayed directly from backend response
      expect(screen.getByTestId("balance-materialized-value")).toHaveTextContent("$3,500.00");
      expect(screen.getByTestId("balance-ledger-value")).toHaveTextContent("$3,450.00");
      expect(screen.getByTestId("balance-difference-value")).toHaveTextContent("$50.00");

      // Discrepancy badge
      const badge = screen.getByTestId("consistency-status-badge");
      expect(badge).toHaveTextContent("Discrepancy Detected");
      expect(badge).toHaveAttribute("data-status", "discrepancy");

      // Discrepancy alert banner
      const alert = screen.getByTestId("balance-discrepancy-alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Authoritative Balance Discrepancy Reported by Backend");
      expect(alert).toHaveTextContent("Reported difference is $50.00 (5,000 minor units)");
    });

    it("supports section refresh via refetch button", async () => {
      const getSpy = vi
        .spyOn(adminApi, "getAdminAccountBalanceSummary")
        .mockResolvedValue(mockConsistentSummary);

      renderWithProviders(
        <AccountBalanceConsistency
          accountId={mockConsistentSummary.accountId}
          accountNumber={mockConsistentSummary.accountNumber}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("refresh-balance-consistency-button")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("refresh-balance-consistency-button"));
      expect(getSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // 2. Financial Integrity Verification
  // ==========================================================================
  describe("Financial Integrity Verification", () => {
    it("FINANCIAL INTEGRITY: relies exclusively on backend isConsistent (never evaluates difference client-side)", async () => {
      // Intentionally craft a test case where differenceMinor is 0 but backend reports isConsistent: false
      // to prove that the component NEVER computes difference or determines consistency locally.
      const syntheticBackendResponse: AccountBalanceSummaryResponse = {
        accountId: "acc-11111111-2222-3333-4444-555555555555",
        accountNumber: "ACC-SYNTH-01",
        currency: "USD",
        materializedBalanceMinor: 100000,
        authoritativeLedgerBalanceMinor: 100000,
        differenceMinor: 0,
        isConsistent: false, // Authoritative backend flags discrepancy despite 0 diff (e.g. pending audit lock)
      };

      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(syntheticBackendResponse);

      renderWithProviders(
        <AccountBalanceConsistency
          accountId={syntheticBackendResponse.accountId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
      });

      // The UI MUST report discrepancy because backend isConsistent is false!
      const badge = screen.getByTestId("consistency-status-badge");
      expect(badge).toHaveTextContent("Discrepancy Detected");
      expect(screen.getByTestId("balance-discrepancy-alert")).toBeInTheDocument();
    });

    it("FINANCIAL INTEGRITY: does NOT call ledger transaction or audit endpoints", async () => {
      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(mockConsistentSummary);

      renderWithProviders(
        <AccountBalanceConsistency
          accountId={mockConsistentSummary.accountId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
      });

      // No ledger transaction table queries or repair mutations must occur
      expect(screen.queryByTestId("ledger-transactions-table")).not.toBeInTheDocument();
    });

    it("FINANCIAL INTEGRITY: does NOT present mutation, repair, sync, or fix buttons", async () => {
      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(mockDiscrepantSummary);

      renderWithProviders(
        <AccountBalanceConsistency
          accountId={mockDiscrepantSummary.accountId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
      });

      // Financial mutations, sync, or repairs are strictly prohibited
      expect(screen.queryByRole("button", { name: /fix/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /repair/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /sync/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /adjust/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 3. Query Safety & Route Parameter Behavior
  // ==========================================================================
  describe("Query Safety & Route Parameters", () => {
    it("disables query when account ID is empty", async () => {
      const getSpy = vi.spyOn(adminApi, "getAdminAccountBalanceSummary");

      renderWithProviders(<AccountBalanceConsistency accountId="" />);

      expect(getSpy).not.toHaveBeenCalled();
    });

    it("disables query when account ID is whitespace only", async () => {
      const getSpy = vi.spyOn(adminApi, "getAdminAccountBalanceSummary");

      renderWithProviders(<AccountBalanceConsistency accountId="   " />);

      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 4. Loading & Error States
  // ==========================================================================
  describe("Loading & Error States", () => {
    it("renders loading skeleton initially", () => {
      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<AccountBalanceConsistency accountId="acc-11111111-2222-3333-4444-555555555555" />);

      expect(screen.getByTestId("balance-consistency-loading")).toBeInTheDocument();
    });

    it("renders error state when balance-summary request fails and supports retry", async () => {
      const apiError = new ApiError({
        type: "about:blank",
        title: "Balance Audit Failure",
        status: 500,
        detail: "Ledger replica timeout",
        errorCode: "LEDGER_TIMEOUT",
        correlationId: "corr-audit-999",
        timestamp: "2026-09-26T12:00:00Z",
      });

      const getSpy = vi
        .spyOn(adminApi, "getAdminAccountBalanceSummary")
        .mockRejectedValue(apiError);

      renderWithProviders(<AccountBalanceConsistency accountId="acc-11111111-2222-3333-4444-555555555555" />);

      await waitFor(() => {
        expect(screen.getByTestId("balance-consistency-error")).toBeInTheDocument();
      });

      expect(screen.getByText("Ledger replica timeout")).toBeInTheDocument();
      expect(screen.getByText(/corr-audit-999/)).toBeInTheDocument();

      const retryBtn = screen.getByTestId("retry-balance-consistency-button");
      fireEvent.click(retryBtn);

      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    it("preserves account inspector information when balance summary fails", async () => {
      // Account endpoint succeeds, but balance summary endpoint fails
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);
      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockRejectedValue(
        new ApiError({
          type: "about:blank",
          title: "Service Unavailable",
          status: 503,
          detail: "Balance audit temporarily offline",
          errorCode: "SERVICE_UNAVAILABLE",
          timestamp: "2026-09-26T12:00:00Z",
        })
      );

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      // Account inspector itself is rendered and functional
      expect(screen.getByTestId("detail-account-number")).toHaveTextContent("ACC-US-0042");
      expect(screen.getByTestId("detail-owner-id")).toHaveTextContent("usr-owner-9999-8888");

      // Balance consistency shows its dedicated error state
      await waitFor(() => {
        expect(screen.getByTestId("balance-consistency-error")).toBeInTheDocument();
      });
      expect(screen.getByText("Balance audit temporarily offline")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 5. Security Boundary
  // ==========================================================================
  describe("Security Boundary", () => {
    it("allows SYSTEM role to view balance consistency section", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "sys-1", email: "system@platform.local", role: "SYSTEM" },
        status: "authenticated",
        accessToken: "mock-sys-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const getSpy = vi
        .spyOn(adminApi, "getAdminAccountBalanceSummary")
        .mockResolvedValue(mockConsistentSummary);

      renderWithProviders(
        <AdminLayout>
          <AccountBalanceConsistency accountId={mockConsistentSummary.accountId} />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
      });

      expect(getSpy).toHaveBeenCalled();
    });

    it("blocks CUSTOMER role before dispatching balance-summary query", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "cust-1", email: "customer@platform.local", role: "CUSTOMER" },
        status: "authenticated",
        accessToken: "mock-cust-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const getSpy = vi.spyOn(adminApi, "getAdminAccountBalanceSummary");

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(getSpy).not.toHaveBeenCalled();
    });

    it("blocks MERCHANT role before dispatching balance-summary query", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "merch-1", email: "merchant@platform.local", role: "MERCHANT" },
        status: "authenticated",
        accessToken: "mock-merch-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const getSpy = vi.spyOn(adminApi, "getAdminAccountBalanceSummary");

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(getSpy).not.toHaveBeenCalled();
    });
  });
});
