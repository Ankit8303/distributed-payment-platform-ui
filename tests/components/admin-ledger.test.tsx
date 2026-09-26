import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLedgerTransactionsPage from "@/app/(admin)/admin/ledger/transactions/page";
import AdminLedgerTransactionDetailPage from "@/app/(admin)/admin/ledger/transactions/[id]/page";
import AdminAccountLedgerPage from "@/app/(admin)/admin/ledger/accounts/[accountId]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { Page, LedgerTransactionAdminResponse, LedgerEntryAdminResponse } from "@/types/admin";
import AdminLayout from "@/app/(admin)/layout";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockParams = { id: "ltx-11111111-2222-3333-4444-555555555555", accountId: "acc-test-001" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/admin/ledger/transactions",
  useSearchParams: () => mockSearchParams,
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

const mockLedgerTx1: LedgerTransactionAdminResponse = {
  id: "ltx-11111111-2222-3333-4444-555555555555",
  sourceReferenceId: "pay-11111111-2222-3333-4444-555555555555",
  sourceReferenceType: "PAYMENT",
  description: "Settlement for order #12345",
  createdAt: "2026-09-26T10:00:00Z",
  entries: [
    {
      id: "ent-001",
      accountId: "acc-payer-001",
      direction: "DEBIT",
      amountMinor: 25000,
      currency: "USD",
      sequenceNumber: 1,
      createdAt: "2026-09-26T10:00:00Z",
    },
    {
      id: "ent-002",
      accountId: "acc-payee-001",
      direction: "CREDIT",
      amountMinor: 25000,
      currency: "USD",
      sequenceNumber: 2,
      createdAt: "2026-09-26T10:00:00Z",
    },
  ],
};

const mockLedgerTxPage: Page<LedgerTransactionAdminResponse> = {
  content: [mockLedgerTx1],
  pageable: {
    pageNumber: 0,
    pageSize: 20,
    offset: 0,
    paged: true,
    unpaged: false,
    sort: { sorted: true, unsorted: false, empty: false },
  },
  totalElements: 1,
  totalPages: 1,
  last: true,
  first: true,
  size: 20,
  number: 0,
  sort: { sorted: true, unsorted: false, empty: false },
  numberOfElements: 1,
  empty: false,
};

const mockAccountEntriesPage: Page<LedgerEntryAdminResponse> = {
  content: [
    {
      id: "ent-101",
      accountId: "acc-test-001",
      direction: "DEBIT",
      amountMinor: 15000,
      currency: "USD",
      sequenceNumber: 1,
      createdAt: "2026-09-26T09:30:00Z",
    },
    {
      id: "ent-102",
      accountId: "acc-test-001",
      direction: "CREDIT",
      amountMinor: 5000,
      currency: "USD",
      sequenceNumber: 2,
      createdAt: "2026-09-26T09:45:00Z",
    },
  ],
  pageable: {
    pageNumber: 0,
    pageSize: 20,
    offset: 0,
    paged: true,
    unpaged: false,
    sort: { sorted: true, unsorted: false, empty: false },
  },
  totalElements: 2,
  totalPages: 1,
  last: true,
  first: true,
  size: 20,
  number: 0,
  sort: { sorted: true, unsorted: false, empty: false },
  numberOfElements: 2,
  empty: false,
};

describe("Admin Standalone Ledger Exploration (Phase F7-F)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockSearchParams = new URLSearchParams();
    mockParams = {
      id: "ltx-11111111-2222-3333-4444-555555555555",
      accountId: "acc-test-001",
    };

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
  // 1. Transaction List View
  // ==========================================================================
  describe("Ledger Transactions List Page", () => {
    it("renders paginated ledger transactions with verified columns", async () => {
      vi.spyOn(adminApi, "getAdminLedgerTransactions").mockResolvedValueOnce(mockLedgerTxPage);

      renderWithProviders(<AdminLedgerTransactionsPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId(`ledger-tx-row-${mockLedgerTx1.id}`)
        ).toBeInTheDocument();
      });

      // Heading
      expect(
        screen.getByRole("heading", { level: 1, name: "Ledger Transactions" })
      ).toBeInTheDocument();

      // Description & Source Type
      expect(screen.getByText("Settlement for order #12345")).toBeInTheDocument();
      expect(screen.getByText("PAYMENT")).toBeInTheDocument();

      // Entry count
      expect(screen.getByText("2")).toBeInTheDocument();

      // Link to detail view
      expect(screen.getByTestId(`view-ledger-tx-${mockLedgerTx1.id}`)).toHaveAttribute(
        "href",
        `/admin/ledger/transactions/${mockLedgerTx1.id}`
      );
    });

    it("submits sourceReferenceType filter and updates URL query parameters", async () => {
      vi.spyOn(adminApi, "getAdminLedgerTransactions").mockResolvedValue(mockLedgerTxPage);

      renderWithProviders(<AdminLedgerTransactionsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("filter-source-type-select")).toBeInTheDocument();
      });

      const select = screen.getByTestId("filter-source-type-select");
      const form = screen.getByTestId("admin-ledger-filters-form");

      fireEvent.change(select, { target: { value: "REFUND" } });
      fireEvent.submit(form);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("sourceReferenceType=REFUND")
      );
    });

    it("renders clear empty state when no transactions exist", async () => {
      const emptyPage: Page<LedgerTransactionAdminResponse> = {
        ...mockLedgerTxPage,
        content: [],
        totalElements: 0,
        totalPages: 0,
        empty: true,
      };

      vi.spyOn(adminApi, "getAdminLedgerTransactions").mockResolvedValueOnce(emptyPage);

      renderWithProviders(<AdminLedgerTransactionsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-ledger-empty-state")).toBeInTheDocument();
      });

      expect(screen.getByText("No ledger transactions found")).toBeInTheDocument();
    });

    it("renders error state when backend ledger query fails", async () => {
      const errorResponse = {
        type: "https://api.paymentledger.com/errors/DATABASE_ERROR",
        title: "Ledger Read Timeout",
        status: 504,
        detail: "Replica database read timed out",
        errorCode: "DATABASE_TIMEOUT",
        correlationId: "corr-ledger-list-fail",
        timestamp: "2026-09-26T10:00:00Z",
      };

      vi.spyOn(adminApi, "getAdminLedgerTransactions").mockRejectedValue(
        new ApiError(errorResponse)
      );

      renderWithProviders(<AdminLedgerTransactionsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-error-state")).toBeInTheDocument();
      });

      expect(screen.getByText("Ledger Read Timeout")).toBeInTheDocument();
      expect(screen.getByTestId("admin-error-correlation-id")).toHaveTextContent(
        "Correlation ID: corr-ledger-list-fail"
      );
    });
  });

  // ==========================================================================
  // 2. Transaction Detail View
  // ==========================================================================
  describe("Ledger Transaction Detail Page", () => {
    it("fetches single ledger transaction and renders double-entry legs with formatMoney", async () => {
      vi.spyOn(adminApi, "getAdminLedgerTransaction").mockResolvedValueOnce(mockLedgerTx1);

      renderWithProviders(<AdminLedgerTransactionDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId("admin-ledger-tx-detail-container")
        ).toBeInTheDocument();
      });

      // Heading and Source Info
      expect(
        screen.getByRole("heading", { level: 1, name: "Ledger Transaction" })
      ).toBeInTheDocument();
      expect(screen.getByTestId("source-reference-type")).toHaveTextContent("PAYMENT");
      expect(screen.getByTestId("source-payment-link")).toHaveAttribute(
        "href",
        `/admin/payments/${mockLedgerTx1.sourceReferenceId}`
      );

      // Entries Table
      expect(screen.getByTestId("ledger-entries-detail-table")).toBeInTheDocument();
      expect(screen.getByTestId("ledger-direction-badge-debit")).toHaveTextContent("DEBIT");
      expect(screen.getByTestId("ledger-direction-badge-credit")).toHaveTextContent("CREDIT");

      // Amounts formatted via formatMoney
      const amounts = screen.getAllByText("$250.00");
      expect(amounts.length).toBe(2);

      // Link to account ledger
      expect(
        screen.getByTestId("account-ledger-link-acc-payer-001")
      ).toHaveAttribute("href", "/admin/ledger/accounts/acc-payer-001");
    });

    it("verifies read-only integrity: zero mutation buttons on transaction detail", async () => {
      vi.spyOn(adminApi, "getAdminLedgerTransaction").mockResolvedValueOnce(mockLedgerTx1);

      renderWithProviders(<AdminLedgerTransactionDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId("admin-ledger-tx-detail-container")
        ).toBeInTheDocument();
      });

      // Ensure no mutation buttons
      expect(screen.queryByRole("button", { name: /create/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /adjust/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reverse/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 3. Account Ledger Entries View
  // ==========================================================================
  describe("Account Ledger Page", () => {
    it("fetches account entries and renders table with sequence numbers and directions", async () => {
      vi.spyOn(adminApi, "getAdminAccountLedgerEntries").mockResolvedValueOnce(
        mockAccountEntriesPage
      );

      renderWithProviders(<AdminAccountLedgerPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId("admin-account-entries-table")
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("heading", { level: 1, name: "Account Ledger Entries" })
      ).toBeInTheDocument();
      expect(screen.getByTestId("header-account-id")).toHaveTextContent("acc-test-001");

      // Entry rows with sequence numbers, directions, and formatted amounts
      const row1 = screen.getByTestId("account-entry-row-ent-101");
      expect(row1).toHaveTextContent("1");
      expect(row1).toHaveTextContent("$150.00");
      expect(row1).toHaveTextContent("DEBIT");

      const row2 = screen.getByTestId("account-entry-row-ent-102");
      expect(row2).toHaveTextContent("2");
      expect(row2).toHaveTextContent("$50.00");
      expect(row2).toHaveTextContent("CREDIT");
    });
  });

  // ==========================================================================
  // 4. Role-Based Access Control
  // ==========================================================================
  describe("Security Boundary", () => {
    it("allows SYSTEM role to view ledger transactions and triggers API call", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "sys-1", email: "worker@platform.local", role: "SYSTEM" },
        status: "authenticated",
        accessToken: "mock-sys-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi
        .spyOn(adminApi, "getAdminLedgerTransactions")
        .mockResolvedValueOnce(mockLedgerTxPage);

      renderWithProviders(
        <AdminLayout>
          <AdminLedgerTransactionsPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { level: 1, name: "Ledger Transactions" })
        ).toBeInTheDocument();
      });
      expect(apiSpy).toHaveBeenCalled();
    });

    it("blocks CUSTOMER role from viewing ledger and makes zero ledger API calls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "cust-1", email: "user@platform.local", role: "CUSTOMER" },
        status: "authenticated",
        accessToken: "mock-cust-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi.spyOn(adminApi, "getAdminLedgerTransactions");

      renderWithProviders(
        <AdminLayout>
          <AdminLedgerTransactionsPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("heading", { level: 1, name: "Ledger Transactions" })
      ).not.toBeInTheDocument();
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it("blocks MERCHANT role from viewing ledger and makes zero ledger API calls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "merch-1", email: "merch@platform.local", role: "MERCHANT" },
        status: "authenticated",
        accessToken: "mock-merch-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi.spyOn(adminApi, "getAdminLedgerTransactions");

      renderWithProviders(
        <AdminLayout>
          <AdminLedgerTransactionsPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("heading", { level: 1, name: "Ledger Transactions" })
      ).not.toBeInTheDocument();
      expect(apiSpy).not.toHaveBeenCalled();
    });
  });
});
