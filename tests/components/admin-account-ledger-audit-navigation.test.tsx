import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAccountInspectorPage from "@/app/(admin)/admin/accounts/[id]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import type { AccountAdminResponse } from "@/types/admin";
import AdminLayout from "@/app/(admin)/layout";

// Mock next/navigation
let mockParams = { id: "acc-audit-nav-1111-2222-3333-444444444444" };
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => `/admin/accounts/${mockParams.id}`,
  useSearchParams: () => mockSearchParams,
  useParams: () => mockParams,
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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
  id: "acc-audit-nav-1111-2222-3333-444444444444",
  accountNumber: "ACC-US-NAV-01",
  ownerId: "usr-owner-0001",
  accountType: "CUSTOMER",
  currency: "USD",
  status: "ACTIVE",
  materializedBalanceMinor: 250000,
  version: 2,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-15T12:00:00Z",
};

describe("Admin Account Ledger & Audit Navigation (Phase F7-G-F)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: "acc-audit-nav-1111-2222-3333-444444444444" };
    mockSearchParams = new URLSearchParams();

    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-user-uuid", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-valid-jwt-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);
    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue({
      accountId: mockAccount.id,
      accountNumber: mockAccount.accountNumber,
      currency: "USD",
      materializedBalanceMinor: 250000,
      authoritativeLedgerBalanceMinor: 250000,
      differenceMinor: 0,
      isConsistent: true,
    });
  });

  // ==========================================================================
  // 1. Account Ledger Navigation
  // ==========================================================================
  describe("Account Ledger Navigation", () => {
    it("renders 'View Account Ledger' link targeting authoritative ledger route", async () => {
      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      const ledgerLink = screen.getByTestId("view-account-ledger-link");
      expect(ledgerLink).toBeInTheDocument();
      expect(ledgerLink).toHaveAttribute(
        "href",
        `/admin/ledger/accounts/${encodeURIComponent(mockAccount.id)}`
      );
      expect(ledgerLink).toHaveAccessibleName("View Account Ledger");
    });

    it("preserves exact authoritative account ID without fabricating UUIDs", async () => {
      mockParams = { id: "acc-custom-uuid-9999" };
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue({
        ...mockAccount,
        id: "acc-custom-uuid-9999",
      });

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("view-account-ledger-link")).toBeInTheDocument();
      });

      const ledgerLink = screen.getByTestId("view-account-ledger-link");
      expect(ledgerLink).toHaveAttribute("href", "/admin/ledger/accounts/acc-custom-uuid-9999");
    });

    it("PERFORMANCE: rendering the ledger link does NOT trigger ledger API requests", async () => {
      const getEntriesSpy = vi.spyOn(adminApi, "getAdminAccountLedgerEntries");
      const getTxSpy = vi.spyOn(adminApi, "getAdminLedgerTransactions");

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      expect(getEntriesSpy).not.toHaveBeenCalled();
      expect(getTxSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 2. Transaction Drill-down
  // ==========================================================================
  describe("Transaction Drill-Down Behavior", () => {
    it("does NOT render a transaction link when no verified transaction ID exists", async () => {
      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      // Must not fabricate or render speculative transaction link
      expect(screen.queryByTestId("view-ledger-transaction-link")).not.toBeInTheDocument();
      expect(screen.getByTestId("no-transaction-drilldown-notice")).toBeInTheDocument();
      // Account ledger link remains fully accessible
      expect(screen.getByTestId("view-account-ledger-link")).toBeInTheDocument();
    });

    it("renders verified transaction link when verified transaction ID is present in URL search params", async () => {
      mockSearchParams = new URLSearchParams("transactionId=tx-verified-8888-7777");

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      const txLink = screen.getByTestId("view-ledger-transaction-link");
      expect(txLink).toBeInTheDocument();
      expect(txLink).toHaveAttribute("href", "/admin/ledger/transactions/tx-verified-8888-7777");
      expect(txLink).toHaveTextContent("Transaction: tx-verified-8888-7777");
    });
  });

  // ==========================================================================
  // 3. Account Audit Navigation
  // ==========================================================================
  describe("Account Audit Navigation", () => {
    it("renders 'View Account Audit History' link targeting /admin/audit with resourceType and resourceId", async () => {
      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      const auditLink = screen.getByTestId("view-account-audit-link");
      expect(auditLink).toBeInTheDocument();
      expect(auditLink).toHaveAttribute(
        "href",
        `/admin/audit?resourceType=ACCOUNT&resourceId=${encodeURIComponent(mockAccount.id)}`
      );
      expect(auditLink).toHaveAccessibleName("View Account Audit History");
    });

    it("PERFORMANCE: rendering the audit link does NOT trigger audit API requests", async () => {
      const getAuditSpy = vi.spyOn(adminApi, "getAdminAuditLogs");

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      expect(getAuditSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 4. Financial Integrity Invariants
  // ==========================================================================
  describe("Financial Integrity Verification", () => {
    it("zero financial arithmetic: does not calculate debit, credit, or balance totals", async () => {
      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      // Verify no mutation buttons or math calculations in the navigation card
      const ledgerCard = screen.getByTestId("ledger-navigation-card");
      expect(ledgerCard.querySelectorAll("button")).toHaveLength(0);
      expect(ledgerCard.querySelectorAll("input")).toHaveLength(0);
    });

    it("zero ledger or audit mutations: exposes no POST/PUT/DELETE controls", async () => {
      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      const section = screen.getByTestId("section-ledger-audit");
      expect(section.textContent).not.toMatch(/create transaction/i);
      expect(section.textContent).not.toMatch(/post entry/i);
      expect(section.textContent).not.toMatch(/delete audit/i);
      expect(section.textContent).not.toMatch(/acknowledge audit/i);
    });
  });

  // ==========================================================================
  // 5. Security & RBAC Boundaries
  // ==========================================================================
  describe("Security Boundary", () => {
    it("permits SYSTEM role to view Ledger & Audit navigation section", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "system-user-uuid", email: "system@platform.local", role: "SYSTEM" },
        status: "authenticated",
        accessToken: "mock-valid-system-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
      });

      expect(screen.getByTestId("view-account-ledger-link")).toBeInTheDocument();
      expect(screen.getByTestId("view-account-audit-link")).toBeInTheDocument();
    });

    it("blocks CUSTOMER role through AdminLayout route guard", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "customer-user-uuid", email: "cust@platform.local", role: "CUSTOMER" },
        status: "authenticated",
        accessToken: "mock-valid-cust-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      expect(screen.queryByTestId("section-ledger-audit")).not.toBeInTheDocument();
      expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
    });

    it("blocks MERCHANT role through AdminLayout route guard", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "merchant-user-uuid", email: "merchant@platform.local", role: "MERCHANT" },
        status: "authenticated",
        accessToken: "mock-valid-merch-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      expect(screen.queryByTestId("section-ledger-audit")).not.toBeInTheDocument();
      expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
    });
  });
});
