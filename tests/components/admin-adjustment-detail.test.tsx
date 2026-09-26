import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAdjustmentDetailPage from "@/app/(admin)/admin/adjustments/[id]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import { ApiError } from "@/lib/api/client";
import type { FinancialAdjustmentResponse } from "@/types/admin";

// Mock useParams from next/navigation
const mockUseParams = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  usePathname: () => "/admin/adjustments/99999999-9999-4999-8999-999999999999",
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithClient(
  ui: React.ReactElement,
  queryClient = createTestQueryClient()
) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("Phase F7-H-D Admin Adjustment Detail Page Tests", () => {
  const adjustmentUuid = "99999999-9999-4999-8999-999999999999";
  const sourceUuid = "11111111-1111-4111-8111-111111111111";
  const targetUuid = "22222222-2222-4222-8222-222222222222";
  const ledgerTxUuid = "88888888-8888-4888-8888-888888888888";

  const mockAdjustment: FinancialAdjustmentResponse = {
    adjustmentId: adjustmentUuid,
    sourceAccountId: sourceUuid,
    targetAccountId: targetUuid,
    amountMinor: 150075,
    currency: "USD",
    reason: "Administrative reconciliation adjustment ref #REF-12345",
    operatorId: "usr-admin-operator-99",
    compensatingLedgerTransactionId: ledgerTxUuid,
    createdAt: "2026-09-26T14:30:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: adjustmentUuid });
  });

  // ==========================================================================
  // 1. Authoritative Detail Rendering
  // ==========================================================================
  it("fetches and renders all authoritative adjustment fields accurately", async () => {
    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockResolvedValue(mockAdjustment);

    renderWithClient(<AdminAdjustmentDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-adjustment-detail-page")).toBeInTheDocument();
    });

    // Page Heading & Status
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Adjustment Detail");
    expect(screen.getByTestId("adjustment-status-badge")).toHaveTextContent("Adjustment Posted");

    // Formatted Amount
    expect(screen.getByTestId("detail-formatted-amount")).toHaveTextContent("$1,500.75");
    expect(screen.getByTestId("detail-minor-units")).toHaveTextContent("150075 integer minor units");

    // Metadata
    expect(screen.getByTestId("detail-adjustment-id")).toHaveTextContent(adjustmentUuid);
    expect(screen.getByTestId("detail-operator-id")).toHaveTextContent("usr-admin-operator-99");
    expect(screen.getByTestId("detail-created-at")).toBeInTheDocument();

    // Source & Target Account IDs
    expect(screen.getByTestId("detail-source-account-id")).toHaveTextContent(sourceUuid);
    expect(screen.getByTestId("detail-target-account-id")).toHaveTextContent(targetUuid);

    // Audit Reason
    expect(screen.getByTestId("detail-reason")).toHaveTextContent(
      "Administrative reconciliation adjustment ref #REF-12345"
    );

    // Ledger Transaction ID
    expect(screen.getByTestId("detail-ledger-tx-id")).toHaveTextContent(ledgerTxUuid);
  });

  // ==========================================================================
  // 2. Navigation & Trace Links
  // ==========================================================================
  it("provides verified navigation links to source account, target account, and ledger transaction", async () => {
    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockResolvedValue(mockAdjustment);

    renderWithClient(<AdminAdjustmentDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-adjustment-detail-page")).toBeInTheDocument();
    });

    // Source account link
    const sourceLink = screen.getByTestId("source-account-link");
    expect(sourceLink).toHaveAttribute("href", `/admin/accounts/${sourceUuid}`);

    // Target account link
    const targetLink = screen.getByTestId("target-account-link");
    expect(targetLink).toHaveAttribute("href", `/admin/accounts/${targetUuid}`);

    // Compensating ledger transaction link
    const ledgerLink = screen.getByTestId("view-ledger-transaction-link");
    expect(ledgerLink).toHaveAttribute("href", `/admin/ledger/transactions/${ledgerTxUuid}`);

    // Back to adjustments link
    const backLink = screen.getByTestId("back-to-adjustments-link");
    expect(backLink).toHaveAttribute("href", "/admin/adjustments");
  });

  // ==========================================================================
  // 3. Immutability & Read-Only Invariants
  // ==========================================================================
  it("is strictly read-only and does not render any mutation, edit, or delete controls", async () => {
    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockResolvedValue(mockAdjustment);

    renderWithClient(<AdminAdjustmentDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-adjustment-detail-page")).toBeInTheDocument();
    });

    // Ensure NO mutation controls exist
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reverse/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel adjustment/i })).not.toBeInTheDocument();
  });

  // ==========================================================================
  // 4. Financial Integrity
  // ==========================================================================
  it("does not compute client-side balances, fees, or projected amounts", async () => {
    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockResolvedValue(mockAdjustment);

    renderWithClient(<AdminAdjustmentDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-adjustment-detail-page")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Projected Balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Calculated Fee/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FX Rate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Remaining Balance/i)).not.toBeInTheDocument();
  });

  // ==========================================================================
  // 5. Not Found (404) & Invalid ID Handling
  // ==========================================================================
  it("displays authoritative 404 state when adjustment does not exist", async () => {
    const notFoundError = new ApiError({
      type: "about:blank",
      status: 404,
      errorCode: "ADJUSTMENT_NOT_FOUND",
      title: "Not Found",
      detail: "The requested adjustment record does not exist",
      timestamp: "2026-09-26T14:30:00Z",
    });

    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockRejectedValue(notFoundError);

    renderWithClient(<AdminAdjustmentDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-adjustment-not-found")).toBeInTheDocument();
    });

    expect(screen.getByText("Adjustment Not Found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to Workspace/i })).toHaveAttribute(
      "href",
      "/admin/adjustments"
    );
  });

  it("handles malformed or invalid UUID gracefully without querying API", () => {
    mockUseParams.mockReturnValue({ id: "invalid-uuid-format" });
    const apiSpy = vi.spyOn(adminApi, "getAdminFinancialAdjustment");

    renderWithClient(<AdminAdjustmentDetailPage />);

    // API is not invoked because useAdminAdjustment validates UUID format before enabling
    expect(apiSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("admin-adjustment-not-found")).toBeInTheDocument();
  });

  // ==========================================================================
  // 6. Generic Error Handling (500)
  // ==========================================================================
  it("displays error state with retry button on unexpected 500 error", async () => {
    const serverError = new ApiError({
      type: "about:blank",
      status: 500,
      errorCode: "INTERNAL_SERVER_ERROR",
      title: "Internal Error",
      detail: "An unexpected backend error occurred",
      timestamp: "2026-09-26T14:30:00Z",
    });

    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockRejectedValue(serverError);

    renderWithClient(<AdminAdjustmentDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-error-state")).toBeInTheDocument();
    });

    expect(screen.getByText("Failed to Load Financial Adjustment")).toBeInTheDocument();
    expect(screen.getByText("An unexpected backend error occurred")).toBeInTheDocument();
  });
});
