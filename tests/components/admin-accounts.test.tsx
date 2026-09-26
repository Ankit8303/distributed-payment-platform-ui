import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAccountsPage from "@/app/(admin)/admin/accounts/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { Page, AccountAdminResponse } from "@/types/admin";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockParams = { id: "acc-uuid-101" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/admin/accounts",
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

const mockAccountActive: AccountAdminResponse = {
  id: "acc-11111111-2222-3333-4444-555555555555",
  accountNumber: "ACCT-1111-USD",
  ownerId: "usr-11111111-2222-3333-4444-555555555555",
  accountType: "CUSTOMER",
  currency: "USD",
  status: "ACTIVE",
  materializedBalanceMinor: 250000,
  version: 1,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
};

const mockAccountFrozen: AccountAdminResponse = {
  id: "acc-22222222-3333-4444-5555-666666666666",
  accountNumber: "ACCT-2222-EUR",
  ownerId: "usr-22222222-3333-4444-5555-666666666666",
  accountType: "MERCHANT",
  currency: "EUR",
  status: "FROZEN",
  materializedBalanceMinor: 150000,
  version: 3,
  createdAt: "2026-09-05T12:00:00Z",
  updatedAt: "2026-09-20T14:30:00Z",
};

const mockAccountClosed: AccountAdminResponse = {
  id: "acc-33333333-4444-5555-6666-777777777777",
  accountNumber: "ACCT-3333-GBP",
  ownerId: "usr-33333333-4444-5555-6666-777777777777",
  accountType: "CUSTOMER",
  currency: "GBP",
  status: "CLOSED",
  materializedBalanceMinor: 0,
  version: 5,
  createdAt: "2026-08-01T09:00:00Z",
  updatedAt: "2026-09-15T11:00:00Z",
};

const mockAccountsPage: Page<AccountAdminResponse> = {
  content: [mockAccountActive, mockAccountFrozen, mockAccountClosed],
  pageable: {
    pageNumber: 0,
    pageSize: 20,
    sort: { sorted: true, unsorted: false, empty: false },
    offset: 0,
    paged: true,
    unpaged: false,
  },
  totalElements: 3,
  totalPages: 1,
  last: true,
  first: true,
  size: 20,
  number: 0,
  sort: { sorted: true, unsorted: false, empty: false },
  numberOfElements: 3,
  empty: false,
};

describe("Admin Account Explorer (Phase F7-G-B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockParams = { id: "acc-uuid-101" };

    // Default auth state: ADMIN
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.internal", role: "ADMIN" },
      status: "authenticated",
      accessToken: "admin-jwt-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  // ==========================================================================
  // 1. Rendering & Table Columns
  // ==========================================================================
  describe("Account Table Rendering", () => {
    it("renders paginated accounts with all verified columns and lossless formatted balance", async () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-table")).toBeInTheDocument();
      });

      // Verify Page Title
      expect(screen.getByRole("heading", { level: 1, name: "Account Explorer" })).toBeInTheDocument();

      // Verify Column Headers
      expect(screen.getByRole("button", { name: /Account Number/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Owner ID" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Type/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Currency" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Status/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Materialized Balance/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Created/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Updated/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();

      // Verify Account Rows
      expect(screen.getByTestId(`account-row-${mockAccountActive.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`account-row-${mockAccountFrozen.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`account-row-${mockAccountClosed.id}`)).toBeInTheDocument();

      // Verify Account Numbers
      expect(screen.getByText("ACCT-1111-USD")).toBeInTheDocument();
      expect(screen.getByText("ACCT-2222-EUR")).toBeInTheDocument();
      expect(screen.getByText("ACCT-3333-GBP")).toBeInTheDocument();

      // Verify Formatted Monetary Balances (lossless formatting with minor units)
      expect(screen.getByText("$2,500.00")).toBeInTheDocument();
      expect(screen.getByText("€1,500.00")).toBeInTheDocument();
      expect(screen.getByText("£0.00")).toBeInTheDocument();

      // Verify Status Badges
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Frozen")).toBeInTheDocument();
      expect(screen.getByText("Closed")).toBeInTheDocument();

      // Verify Inspect Action Links
      const inspectLink = screen.getByTestId(`inspect-account-${mockAccountActive.id}`);
      expect(inspectLink).toHaveAttribute("href", `/admin/accounts/${mockAccountActive.id}`);
    });
  });

  // ==========================================================================
  // 2. Filtering & Priority Semantics
  // ==========================================================================
  describe("Account Filtering & Mutually Exclusive UX", () => {
    it("filters by Owner ID when owner mode is applied", async () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue({
        ...mockAccountsPage,
        content: [mockAccountActive],
        totalElements: 1,
      });

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-table")).toBeInTheDocument();
      });

      const input = screen.getByTestId("filter-owner-id-input");
      fireEvent.change(input, { target: { value: "usr-11111111-2222-3333-4444-555555555555" } });

      const form = screen.getByTestId("admin-account-filters-form");
      fireEvent.submit(form);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("ownerId=usr-11111111-2222-3333-4444-555555555555")
      );
    });

    it("rejects whitespace-only Owner ID submission with validation message", async () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-table")).toBeInTheDocument();
      });

      const input = screen.getByTestId("filter-owner-id-input");
      fireEvent.change(input, { target: { value: "    " } });

      const form = screen.getByTestId("admin-account-filters-form");
      fireEvent.submit(form);

      expect(screen.getByTestId("filter-validation-error")).toBeInTheDocument();
      expect(screen.getByText("Owner ID cannot be whitespace only.")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("filters by Status when status mode is selected and applied", async () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-table")).toBeInTheDocument();
      });

      // Switch to Status mode tab
      fireEvent.click(screen.getByTestId("filter-mode-status"));

      const select = screen.getByTestId("filter-status-select");
      fireEvent.change(select, { target: { value: "FROZEN" } });

      const form = screen.getByTestId("admin-account-filters-form");
      fireEvent.submit(form);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("status=FROZEN"));
      // Contradictory filters MUST NOT be present
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("ownerId="));
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("accountType="));
    });

    it("filters by Account Type when type mode is selected and applied", async () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-table")).toBeInTheDocument();
      });

      // Switch to Account Type mode tab
      fireEvent.click(screen.getByTestId("filter-mode-type"));

      const select = screen.getByTestId("filter-type-select");
      fireEvent.change(select, { target: { value: "MERCHANT" } });

      const form = screen.getByTestId("admin-account-filters-form");
      fireEvent.submit(form);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("accountType=MERCHANT"));
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("ownerId="));
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("status="));
    });

    it("clearing filters resets URL and pagination to default", async () => {
      mockSearchParams = new URLSearchParams("status=FROZEN&page=2");
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-table")).toBeInTheDocument();
      });

      const resetBtn = screen.getByTestId("account-filters-reset-button");
      fireEvent.click(resetBtn);

      expect(mockPush).toHaveBeenCalledWith("/admin/accounts");
    });
  });

  // ==========================================================================
  // 3. Pagination & Sorting
  // ==========================================================================
  describe("Pagination and Sorting Behavior", () => {
    it("handles page navigation and 0-indexed API query parameters", async () => {
      mockSearchParams = new URLSearchParams("page=0&size=20");
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue({
        ...mockAccountsPage,
        totalPages: 3,
        totalElements: 50,
      });

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("pagination-next-button")).toBeInTheDocument();
      });

      const nextBtn = screen.getByTestId("pagination-next-button");
      expect(nextBtn).toBeEnabled();

      fireEvent.click(nextBtn);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=1"));
    });

    it("handles page size changes and resets to page 0", async () => {
      mockSearchParams = new URLSearchParams("page=2&size=20");
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue({
        ...mockAccountsPage,
        totalPages: 5,
        totalElements: 100,
        number: 2,
      });

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("pagination-size-select")).toBeInTheDocument();
      });

      const sizeSelect = screen.getByTestId("pagination-size-select");
      fireEvent.change(sizeSelect, { target: { value: "50" } });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("size=50"));
    });

    it("toggles sorting when verified column headers are clicked", async () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Account Number/i })).toBeInTheDocument();
      });

      // Default sort is createdAt,desc. Clicking Account Number should sort by accountNumber,desc
      const accNumHeader = screen.getByRole("button", { name: /Account Number/i });
      fireEvent.click(accNumHeader);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("sort=accountNumber%2Cdesc"));
    });
  });

  // ==========================================================================
  // 4. Loading, Empty, and Error States
  // ==========================================================================
  describe("Explorer States", () => {
    it("renders loading skeleton during query execution", () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockReturnValue(new Promise(() => {}));

      renderWithProviders(<AdminAccountsPage />);

      expect(screen.getByTestId("admin-accounts-table-loading")).toBeInTheDocument();
    });

    it("renders filtered empty state with clear button when filters match no accounts", async () => {
      mockSearchParams = new URLSearchParams("status=FROZEN");
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue({
        ...mockAccountsPage,
        content: [],
        totalElements: 0,
        totalPages: 0,
        empty: true,
      });

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-filtered-empty")).toBeInTheDocument();
      });

      expect(screen.getByText("No accounts match the active filter")).toBeInTheDocument();

      const clearBtn = screen.getByTestId("empty-clear-filter-button");
      fireEvent.click(clearBtn);

      expect(mockPush).toHaveBeenCalledWith("/admin/accounts");
    });

    it("renders overall empty state when no accounts exist platform-wide", async () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue({
        ...mockAccountsPage,
        content: [],
        totalElements: 0,
        totalPages: 0,
        empty: true,
      });

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-empty")).toBeInTheDocument();
      });

      expect(screen.getByText("No accounts found.")).toBeInTheDocument();
    });

    it("renders AdminErrorState on backend error and supports retry", async () => {
      const apiError = new ApiError({
        type: "about:blank",
        title: "Server Error",
        status: 500,
        detail: "Internal database query failure",
        errorCode: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
      const getSpy = vi.spyOn(adminApi, "getAdminAccounts").mockRejectedValue(apiError);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-error-state")).toBeInTheDocument();
      });

      expect(screen.getByText("Internal database query failure")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryBtn);

      expect(getSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // 5. Financial Integrity Verification
  // ==========================================================================
  describe("Financial Integrity Verification", () => {
    it("FINANCIAL INTEGRITY: does NOT trigger N+1 balance summary requests", async () => {
      const balanceSummarySpy = vi.spyOn(adminApi, "getAdminAccountBalanceSummary");
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-table")).toBeInTheDocument();
      });

      // Crucial: The account list page must NOT call /balance-summary for any row
      expect(balanceSummarySpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 6. Navigation Link Verification
  // ==========================================================================
  describe("Navigation Link", () => {
    it("renders inspect link navigating to /admin/accounts/[id]", async () => {
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);

      renderWithProviders(<AdminAccountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-accounts-table")).toBeInTheDocument();
      });

      const inspectLink = screen.getByTestId(`inspect-account-${mockAccountActive.id}`);
      expect(inspectLink).toHaveAttribute("href", `/admin/accounts/${mockAccountActive.id}`);
    });
  });
});
