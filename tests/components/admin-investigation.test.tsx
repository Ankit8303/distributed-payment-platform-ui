import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminPaymentInvestigationPage from "@/app/(admin)/admin/investigations/payments/[paymentId]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { PaymentInvestigationTraceResponse } from "@/types/admin";
import AdminLayout from "@/app/(admin)/layout";

// Mock next/navigation
const mockPush = vi.fn();
let mockParams = { paymentId: "pay-11111111-2222-3333-4444-555555555555" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/admin/investigations/payments/pay-11111111-2222-3333-4444-555555555555",
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

const mockInvestigationTrace: PaymentInvestigationTraceResponse = {
  payment: {
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
  },
  payerAccount: {
    id: "acc-payer-001",
    accountNumber: "ACT-PAYER-100",
    ownerId: "usr-001",
    accountType: "CUSTOMER",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 125000,
    version: 1,
    createdAt: "2026-09-25T08:00:00Z",
    updatedAt: "2026-09-26T10:00:05Z",
  },
  payeeAccount: {
    id: "acc-payee-001",
    accountNumber: "ACT-PAYEE-200",
    ownerId: "usr-002",
    accountType: "MERCHANT",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 54000,
    version: 2,
    createdAt: "2026-09-25T08:00:00Z",
    updatedAt: "2026-09-26T10:00:06Z",
  },
  ledgerTransaction: {
    id: "ltx-11111111-2222-3333-4444-555555555555",
    sourceReferenceId: "pay-11111111-2222-3333-4444-555555555555",
    sourceReferenceType: "PAYMENT",
    description: "Payment Settlement",
    createdAt: "2026-09-26T10:00:10Z",
    entries: [
      {
        id: "ent-001",
        accountId: "acc-payer-001",
        direction: "DEBIT",
        amountMinor: 25000,
        currency: "USD",
        sequenceNumber: 1,
        createdAt: "2026-09-26T10:00:10Z",
      },
      {
        id: "ent-002",
        accountId: "acc-payee-001",
        direction: "CREDIT",
        amountMinor: 25000,
        currency: "USD",
        sequenceNumber: 2,
        createdAt: "2026-09-26T10:00:10Z",
      },
    ],
  },
  outboxEvents: [
    {
      eventId: "evt-001",
      eventType: "PAYMENT_SETTLED",
      aggregateType: "PAYMENT",
      aggregateId: "pay-11111111-2222-3333-4444-555555555555",
      status: "PUBLISHED",
      topic: "payment.events",
      createdAt: "2026-09-26T10:00:15Z",
      publishedAt: "2026-09-26T10:00:16Z",
    },
  ],
  kafkaAudits: [
    {
      id: "kaud-001",
      eventId: "evt-001",
      eventType: "PAYMENT_SETTLED",
      aggregateId: "pay-11111111-2222-3333-4444-555555555555",
      correlationId: "corr-trace-8899",
      createdAt: "2026-09-26T10:00:17Z",
    },
  ],
  reconciliationCases: [
    {
      id: "rc-001",
      operationType: "PAYMENT",
      operationId: "pay-11111111-2222-3333-4444-555555555555",
      providerReference: "prov-ref-987",
      localStatus: "SETTLED",
      reconciliationStatus: "RESOLVED",
      discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
      attemptCount: 1,
      nextAttemptAt: null,
      resolvedAt: "2026-09-26T10:01:00Z",
      workerId: "recon-worker-1",
      correlationId: "corr-trace-8899",
      createdAt: "2026-09-26T10:00:30Z",
      updatedAt: "2026-09-26T10:01:00Z",
    },
  ],
  notifications: [
    {
      id: "notif-001",
      eventId: "evt-001",
      channel: "EMAIL",
      status: "SENT",
      attemptCount: 1,
      nextAttemptAt: null,
      recipientRedacted: "us***@platform.local",
      createdAt: "2026-09-26T10:00:20Z",
    },
  ],
};

describe("Admin Payment Forensic Investigation (Phase F7-E)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockParams = { paymentId: "pay-11111111-2222-3333-4444-555555555555" };

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
  // Trace Loading & Rendering
  // ==========================================================================
  describe("Investigation Page Rendering", () => {
    it("fetches payment investigation by ID and renders all backend sections", async () => {
      const apiSpy = vi
        .spyOn(adminApi, "getAdminPaymentInvestigation")
        .mockResolvedValueOnce(mockInvestigationTrace);

      renderWithProviders(<AdminPaymentInvestigationPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId("admin-investigation-container")
        ).toBeInTheDocument();
      });

      // 1. API called with correct payment ID
      expect(apiSpy).toHaveBeenCalledWith(
        "pay-11111111-2222-3333-4444-555555555555",
        expect.any(Object)
      );

      // 2. Primary Heading
      expect(
        screen.getByRole("heading", { level: 1, name: "Payment Investigation" })
      ).toBeInTheDocument();

      // 3. Payment Summary
      expect(screen.getByTestId("detail-amount-value")).toHaveTextContent("$250.00");
      expect(screen.getByTestId("detail-fee-value")).toHaveTextContent("$1.50");
      expect(screen.getByText("prov-ref-987")).toBeInTheDocument();
      expect(screen.getByText("idem-key-001")).toBeInTheDocument();

      // 4. Account Context
      expect(screen.getByTestId("payer-account-id")).toHaveTextContent("acc-payer-001");
      expect(screen.getByTestId("payee-account-id")).toHaveTextContent("acc-payee-001");
      expect(screen.getByText("$1,250.00")).toBeInTheDocument();
      expect(screen.getByText("$540.00")).toBeInTheDocument();

      // 5. Double-Entry Ledger Transaction & Entries
      expect(screen.getByTestId("ledger-transaction-section")).toBeInTheDocument();
      expect(screen.getByTestId("ledger-entries-table")).toBeInTheDocument();
      expect(screen.getByTestId("ledger-direction-badge-debit")).toHaveTextContent("DEBIT");
      expect(screen.getByTestId("ledger-direction-badge-credit")).toHaveTextContent("CREDIT");

      // 6. Outbox Events
      expect(screen.getByTestId("outbox-events-section")).toBeInTheDocument();
      expect(screen.getAllByText("PAYMENT_SETTLED").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId("outbox-status-badge-published")).toHaveTextContent("PUBLISHED");

      // 7. Kafka Audit
      expect(screen.getByTestId("kafka-audit-section")).toBeInTheDocument();
      expect(screen.getAllByText("corr-trace-8899").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/Transport audit evidence/i)
      ).toBeInTheDocument();

      // 8. Reconciliation Cases
      expect(screen.getByTestId("reconciliation-section")).toBeInTheDocument();
      expect(screen.getByTestId("recon-status-badge-resolved")).toHaveTextContent("RESOLVED");
      expect(screen.getByText("PROVIDER_SUCCESS_LOCAL_PENDING")).toBeInTheDocument();

      // 9. Notifications
      expect(screen.getByTestId("notifications-section")).toBeInTheDocument();
      expect(screen.getByTestId("notification-status-badge-sent")).toHaveTextContent("SENT");
      expect(screen.getByText("us***@platform.local")).toBeInTheDocument();

      // 10. Lifecycle Timeline
      expect(screen.getByTestId("investigation-timeline-section")).toBeInTheDocument();
    });

    it("renders zero monetary values accurately without treating them as empty", async () => {
      const zeroTrace: PaymentInvestigationTraceResponse = {
        ...mockInvestigationTrace,
        payment: {
          ...mockInvestigationTrace.payment,
          amountMinor: 0,
          feeMinor: 0,
        },
      };

      vi.spyOn(adminApi, "getAdminPaymentInvestigation").mockResolvedValueOnce(zeroTrace);

      renderWithProviders(<AdminPaymentInvestigationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("detail-amount-value")).toBeInTheDocument();
      });

      expect(screen.getByTestId("detail-amount-value")).toHaveTextContent("$0.00");
      expect(screen.getByTestId("detail-fee-value")).toHaveTextContent("$0.00");
    });

    it("renders empty nested collections gracefully without crashing", async () => {
      const emptyNestedTrace: PaymentInvestigationTraceResponse = {
        payment: mockInvestigationTrace.payment,
        payerAccount: null,
        payeeAccount: null,
        ledgerTransaction: null,
        outboxEvents: [],
        kafkaAudits: [],
        reconciliationCases: [],
        notifications: [],
      };

      vi.spyOn(adminApi, "getAdminPaymentInvestigation").mockResolvedValueOnce(emptyNestedTrace);

      renderWithProviders(<AdminPaymentInvestigationPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId("admin-investigation-container")
        ).toBeInTheDocument();
      });

      // Empty states rendered for absent subsystems
      expect(
        screen.getByText(/No double-entry ledger transaction has been posted/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No transactional outbox events recorded/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No Kafka consumer audit records captured/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No reconciliation discrepancy recorded/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No notification dispatches recorded/i)
      ).toBeInTheDocument();
    });

    it("renders structured loading skeleton without flashing fake data", () => {
      vi.spyOn(adminApi, "getAdminPaymentInvestigation").mockReturnValue(
        new Promise(() => {})
      );

      renderWithProviders(<AdminPaymentInvestigationPage />);

      expect(
        screen.getByTestId("admin-investigation-loading")
      ).toBeInTheDocument();
      expect(screen.queryByText("$250.00")).not.toBeInTheDocument();
    });

    it("renders error state with RFC 7807 problem details and correlation ID", async () => {
      const notFoundError = new ApiError({
        type: "https://api.paymentledger.com/errors/NOT_FOUND",
        title: "Payment Investigation Not Found",
        status: 404,
        detail: "No payment record exists for the supplied identifier",
        errorCode: "PAYMENT_NOT_FOUND",
        correlationId: "corr-trace-404-9988",
        timestamp: "2026-09-26T10:20:00Z",
      });

      vi.spyOn(adminApi, "getAdminPaymentInvestigation").mockRejectedValue(notFoundError);

      renderWithProviders(<AdminPaymentInvestigationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-error-state")).toBeInTheDocument();
      });

      expect(screen.getByText("Payment Investigation Not Found")).toBeInTheDocument();
      expect(
        screen.getByText("No payment record exists for the supplied identifier")
      ).toBeInTheDocument();
      expect(screen.getByTestId("admin-error-correlation-id")).toHaveTextContent(
        "Correlation ID: corr-trace-404-9988"
      );
    });

    it("verifies read-only invariants: zero mutation buttons present", async () => {
      vi.spyOn(adminApi, "getAdminPaymentInvestigation").mockResolvedValueOnce(
        mockInvestigationTrace
      );

      renderWithProviders(<AdminPaymentInvestigationPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId("admin-investigation-container")
        ).toBeInTheDocument();
      });

      // Strict check: zero mutation buttons anywhere on the page
      expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /refund/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reverse/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /trigger/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /resolve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /resend/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Role Authorization & Security Boundary
  // ==========================================================================
  describe("Security Boundary", () => {
    it("allows SYSTEM role to view investigation and triggers API call", async () => {
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
        .spyOn(adminApi, "getAdminPaymentInvestigation")
        .mockResolvedValueOnce(mockInvestigationTrace);

      renderWithProviders(
        <AdminLayout>
          <AdminPaymentInvestigationPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { level: 1, name: "Payment Investigation" })
        ).toBeInTheDocument();
      });
      expect(apiSpy).toHaveBeenCalled();
    });

    it("blocks CUSTOMER role from viewing investigation and makes zero investigation API calls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "cust-1", email: "user@platform.local", role: "CUSTOMER" },
        status: "authenticated",
        accessToken: "mock-cust-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi.spyOn(adminApi, "getAdminPaymentInvestigation");

      renderWithProviders(
        <AdminLayout>
          <AdminPaymentInvestigationPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("heading", { level: 1, name: "Payment Investigation" })
      ).not.toBeInTheDocument();
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it("blocks MERCHANT role from viewing investigation and makes zero investigation API calls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "merch-1", email: "merchant@platform.local", role: "MERCHANT" },
        status: "authenticated",
        accessToken: "mock-merch-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      const apiSpy = vi.spyOn(adminApi, "getAdminPaymentInvestigation");

      renderWithProviders(
        <AdminLayout>
          <AdminPaymentInvestigationPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("heading", { level: 1, name: "Payment Investigation" })
      ).not.toBeInTheDocument();
      expect(apiSpy).not.toHaveBeenCalled();
    });
  });
});
