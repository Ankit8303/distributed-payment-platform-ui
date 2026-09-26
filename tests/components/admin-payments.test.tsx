import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminPaymentsPage from "@/app/(admin)/admin/payments/page";
import AdminPaymentDetailPage from "@/app/(admin)/admin/payments/[id]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { Page, PaymentAdminResponse } from "@/types/admin";
import AdminLayout from "@/app/(admin)/layout";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockParams = { id: "pay-12345678-abcd" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/admin/payments",
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

const mockPayment1: PaymentAdminResponse = {
  id: "pay-11111111-2222-3333-4444-555555555555",
  payerAccountId: "acc-payer-001",
  payeeAccountId: "acc-payee-001",
  amountMinor: 25000,
  feeMinor: 150,
  currency: "USD",
  status: "SETTLED",
  providerReference: "prov-ref-987",
  idempotencyKey: "idem-key-001",
  idempotencyScope: "GLOBAL",
  createdAt: "2026-09-26T10:00:00Z",
  updatedAt: "2026-09-26T10:01:00Z",
};

const mockPayment2: PaymentAdminResponse = {
  id: "pay-22222222-3333-4444-5555-666666666666",
  payerAccountId: "acc-payer-002",
  payeeAccountId: "acc-payee-002",
  amountMinor: 0,
  feeMinor: 0,
  currency: "USD",
  status: "PENDING_RECONCILIATION",
  providerReference: null,
  idempotencyKey: "idem-key-002",
  idempotencyScope: null,
  createdAt: "2026-09-26T10:05:00Z",
  updatedAt: "2026-09-26T10:05:30Z",
};

const mockPaymentsPage: Page<PaymentAdminResponse> = {
  content: [mockPayment1, mockPayment2],
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

describe("Admin Payment Operations (Phase F7-D)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockSearchParams = new URLSearchParams();
    mockParams = { id: "pay-11111111-2222-3333-4444-555555555555" };

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

  // ==========================================================================
  // Payment List Tests
  // ==========================================================================
  describe("Payment List Page", () => {
    it("renders backend payment rows with formatted currency, amounts, and fees", async () => {
      vi.spyOn(adminApi, "getAdminPayments").mockResolvedValueOnce(mockPaymentsPage);

      renderWithProviders(<AdminPaymentsPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId(`payment-row-${mockPayment1.id}`)
        ).toBeInTheDocument();
      });

      // Formatted amounts
      expect(screen.getByText("$250.00")).toBeInTheDocument();
      expect(screen.getByText("$1.50")).toBeInTheDocument();

      // Zero-amount fidelity preserved
      expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(1);

      // Status badges
      expect(
        screen.getByTestId("payment-status-badge-settled")
      ).toHaveTextContent("Settled");
      expect(
        screen.getByTestId("payment-status-badge-pending_reconciliation")
      ).toHaveTextContent("Pending Reconciliation");

      // Provider reference
      expect(screen.getByText("prov-ref-987")).toBeInTheDocument();

      // Pagination indicator
      expect(screen.getByText(/showing/i)).toBeInTheDocument();
    });

    it("submits verified filters and updates URL query parameters", async () => {
      vi.spyOn(adminApi, "getAdminPayments").mockResolvedValue(mockPaymentsPage);

      renderWithProviders(<AdminPaymentsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("filter-status-select")).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId("filter-status-select");
      const payerInput = screen.getByTestId("filter-payer-input");
      const form = screen.getByTestId("admin-payment-filters-form");

      fireEvent.change(statusSelect, { target: { value: "SETTLED" } });
      fireEvent.change(payerInput, { target: { value: "acc-payer-999" } });
      fireEvent.submit(form);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("status=SETTLED")
      );
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("payerAccountId=acc-payer-999")
      );
    });

    it("renders clear empty state when no payments match criteria", async () => {
      const emptyPage: Page<PaymentAdminResponse> = {
        ...mockPaymentsPage,
        content: [],
        totalElements: 0,
        totalPages: 0,
        empty: true,
      };

      vi.spyOn(adminApi, "getAdminPayments").mockResolvedValueOnce(emptyPage);

      renderWithProviders(<AdminPaymentsPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId("admin-payments-empty-state")
        ).toBeInTheDocument();
      });

      expect(screen.getByText("No payments found.")).toBeInTheDocument();
    });

    it("renders error state with correlation ID when payment list request fails", async () => {
      const errorResponse = {
        type: "https://api.paymentledger.com/errors/DATABASE_ERROR",
        title: "Query Timeout",
        status: 504,
        detail: "Payment read query timed out on replica",
        errorCode: "DATABASE_TIMEOUT",
        correlationId: "corr-pay-list-fail-1122",
        timestamp: "2026-09-26T10:10:00Z",
      };

      vi.spyOn(adminApi, "getAdminPayments").mockRejectedValue(
        new ApiError(errorResponse)
      );

      renderWithProviders(<AdminPaymentsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-error-state")).toBeInTheDocument();
      });

      expect(screen.getByText("Query Timeout")).toBeInTheDocument();
      expect(
        screen.getByText("Payment read query timed out on replica")
      ).toBeInTheDocument();
      expect(screen.getByTestId("admin-error-correlation-id")).toHaveTextContent(
        "Correlation ID: corr-pay-list-fail-1122"
      );
    });
  });

  // ==========================================================================
  // Payment Detail Tests
  // ==========================================================================
  describe("Payment Detail Page", () => {
    it("fetches payment by ID and renders verified fields in structured sections", async () => {
      vi.spyOn(adminApi, "getAdminPayment").mockResolvedValueOnce(mockPayment1);

      renderWithProviders(<AdminPaymentDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId("admin-payment-detail-container")
        ).toBeInTheDocument();
      });

      // Heading and ID
      expect(
        screen.getByRole("heading", { level: 1, name: "Payment Details" })
      ).toBeInTheDocument();
      expect(screen.getByText(`ID: ${mockPayment1.id}`)).toBeInTheDocument();

      // Formatted amounts
      expect(screen.getByTestId("detail-amount-value")).toHaveTextContent("$250.00");
      expect(screen.getByTestId("detail-fee-value")).toHaveTextContent("$1.50");

      // Account Routing
      expect(screen.getByTestId("detail-payer-account-id")).toHaveTextContent(
        mockPayment1.payerAccountId
      );
      expect(screen.getByTestId("detail-payee-account-id")).toHaveTextContent(
        mockPayment1.payeeAccountId
      );

      // Provider reference
      expect(screen.getByTestId("detail-provider-ref")).toHaveTextContent(
        mockPayment1.providerReference!
      );

      // Idempotency Key
      expect(screen.getByText(mockPayment1.idempotencyKey)).toBeInTheDocument();

      // Navigation affordances
      expect(screen.getByTestId("back-to-payments-link")).toHaveAttribute(
        "href",
        "/admin/payments"
      );
      expect(screen.getByTestId("investigate-payment-button")).toHaveAttribute(
        "href",
        `/admin/investigations/payments/${mockPayment1.id}`
      );
    });

    it("renders loading skeleton without flashing fake data", () => {
      vi.spyOn(adminApi, "getAdminPayment").mockReturnValue(
        new Promise(() => {})
      );

      renderWithProviders(<AdminPaymentDetailPage />);

      expect(
        screen.getByTestId("admin-payment-detail-loading")
      ).toBeInTheDocument();
      expect(screen.queryByText("$250.00")).not.toBeInTheDocument();
    });

    it("renders not-found error state when payment does not exist", async () => {
      const notFoundError = new ApiError({
        type: "https://api.paymentledger.com/errors/NOT_FOUND",
        title: "Payment Not Found",
        status: 404,
        detail: "Payment record does not exist or access is restricted",
        errorCode: "PAYMENT_NOT_FOUND",
        correlationId: "corr-detail-404",
        timestamp: "2026-09-26T10:15:00Z",
      });

      vi.spyOn(adminApi, "getAdminPayment").mockRejectedValue(notFoundError);

      renderWithProviders(<AdminPaymentDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-error-state")).toBeInTheDocument();
      });

      expect(screen.getByText("Payment Not Found")).toBeInTheDocument();
      expect(
        screen.getByText("Payment record does not exist or access is restricted")
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Role Authorization & Security Boundary
  // ==========================================================================
  describe("Security Boundary", () => {
    it("allows SYSTEM role to view payments list and triggers API call", async () => {
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
        .spyOn(adminApi, "getAdminPayments")
        .mockResolvedValueOnce(mockPaymentsPage);

      renderWithProviders(
        <AdminLayout>
          <AdminPaymentsPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { level: 1, name: "Payments" })
        ).toBeInTheDocument();
      });
      expect(apiSpy).toHaveBeenCalled();
    });

    it("blocks CUSTOMER role from viewing payments and makes zero payment API calls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "cust-1", email: "user@platform.local", role: "CUSTOMER" },
        status: "authenticated",
        accessToken: "mock-cust-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi.spyOn(adminApi, "getAdminPayments");

      renderWithProviders(
        <AdminLayout>
          <AdminPaymentsPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("heading", { level: 1, name: "Payments" })
      ).not.toBeInTheDocument();
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it("blocks MERCHANT role from viewing payments and makes zero payment API calls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "merch-1", email: "merchant@platform.local", role: "MERCHANT" },
        status: "authenticated",
        accessToken: "mock-merch-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi.spyOn(adminApi, "getAdminPayments");

      renderWithProviders(
        <AdminLayout>
          <AdminPaymentsPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("heading", { level: 1, name: "Payments" })
      ).not.toBeInTheDocument();
      expect(apiSpy).not.toHaveBeenCalled();
    });
  });
});
