import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdjustmentConfirmModal } from "@/features/admin/components/adjustment-confirm-modal";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import { ApiError } from "@/lib/api/client";
import type {
  FinancialAdjustmentCreateRequest,
  FinancialAdjustmentResponse,
  AccountAdminResponse,
} from "@/types/admin";

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

describe("Phase F7-H-C AdjustmentConfirmModal Component Tests", () => {
  const sourceUuid = "11111111-1111-4111-8111-111111111111";
  const targetUuid = "22222222-2222-4222-8222-222222222222";

  const mockPayload: FinancialAdjustmentCreateRequest = {
    sourceAccountId: sourceUuid,
    targetAccountId: targetUuid,
    amountMinor: 25050,
    currency: "USD",
    reason: "Administrative reconciliation adjustment ref #1234",
  };

  const mockSourceAccount: AccountAdminResponse = {
    id: sourceUuid,
    accountNumber: "ACCT-SRC-USD-001",
    ownerId: "owner-001",
    accountType: "INTERNAL_SETTLEMENT",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 500000,
    version: 1,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  };

  const mockTargetAccount: AccountAdminResponse = {
    id: targetUuid,
    accountNumber: "ACCT-TGT-USD-002",
    ownerId: "owner-002",
    accountType: "CUSTOMER",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 100000,
    version: 2,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  };

  const mockResponse: FinancialAdjustmentResponse = {
    adjustmentId: "99999999-9999-4999-8999-999999999999",
    sourceAccountId: sourceUuid,
    targetAccountId: targetUuid,
    amountMinor: 25050,
    currency: "USD",
    reason: "Administrative reconciliation adjustment ref #1234",
    operatorId: "operator-007",
    compensatingLedgerTransactionId: "88888888-8888-4888-8888-888888888888",
    createdAt: "2026-09-26T12:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. Rendering & Review Content
  // ==========================================================================
  it("renders modal with exact frozen payload details and warning notices when open", () => {
    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        sourceAccount={mockSourceAccount}
        targetAccount={mockTargetAccount}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm Financial Adjustment")).toBeInTheDocument();

    // Verify warning list
    expect(screen.getByText(/immediate financial ledger adjustment/i)).toBeInTheDocument();
    expect(screen.getByText(/immutable ledger transaction/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be edited or deleted/i)).toBeInTheDocument();

    // Verify account information
    expect(screen.getByText("ACCT-SRC-USD-001")).toBeInTheDocument();
    expect(screen.getByText("ACCT-TGT-USD-002")).toBeInTheDocument();
    expect(screen.getByText(sourceUuid)).toBeInTheDocument();
    expect(screen.getByText(targetUuid)).toBeInTheDocument();

    // Verify formatted amount
    expect(screen.getByTestId("modal-amount-display")).toHaveTextContent("$250.50");

    // Verify reason
    expect(screen.getByText(new RegExp(mockPayload.reason))).toBeInTheDocument();

    // Verify primary action button
    expect(
      screen.getByRole("button", { name: "Confirm & Post Adjustment" })
    ).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={false}
        payload={mockPayload}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ==========================================================================
  // 2. Cancellation & Escape Behavior
  // ==========================================================================
  it("invokes onClose when Cancel button is clicked without invoking mutation", () => {
    const onCloseSpy = vi.fn();
    const mutationSpy = vi.spyOn(adminApi, "createAdminFinancialAdjustment");

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        onClose={onCloseSpy}
        onSuccess={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel \/ Back to Form/i });
    fireEvent.click(cancelBtn);

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(mutationSpy).not.toHaveBeenCalled();
  });

  it("invokes onClose when Escape key is pressed", () => {
    const onCloseSpy = vi.fn();

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        onClose={onCloseSpy}
        onSuccess={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  // ==========================================================================
  // 3. Idempotency Key Generation & Mutation Execution
  // ==========================================================================
  it("generates exactly ONE UUIDv4 idempotency key upon explicit confirmation and passes exact payload", async () => {
    const mutationSpy = vi
      .spyOn(adminApi, "createAdminFinancialAdjustment")
      .mockResolvedValue(mockResponse);
    const onSuccessSpy = vi.fn();

    const randomUuidSpy = vi.spyOn(crypto, "randomUUID");

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        onClose={vi.fn()}
        onSuccess={onSuccessSpy}
      />
    );

    // crypto.randomUUID should NOT be called during render or opening
    expect(randomUuidSpy).not.toHaveBeenCalled();

    const confirmBtn = screen.getByRole("button", {
      name: "Confirm & Post Adjustment",
    });
    fireEvent.click(confirmBtn);

    // Now crypto.randomUUID is called once
    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
    const generatedKey = randomUuidSpy.mock.results[0]!.value;

    await waitFor(() => {
      expect(mutationSpy).toHaveBeenCalledTimes(1);
    });

    expect(mutationSpy).toHaveBeenCalledWith(mockPayload, generatedKey);
    expect(onSuccessSpy).toHaveBeenCalledWith(mockResponse);
  });

  it("disables confirmation action and shows pending indicator while mutation is in-flight", async () => {
    let resolveMutation: (val: FinancialAdjustmentResponse) => void = () => {};
    const deferredPromise = new Promise<FinancialAdjustmentResponse>((resolve) => {
      resolveMutation = resolve;
    });

    vi.spyOn(adminApi, "createAdminFinancialAdjustment").mockImplementation(
      () => deferredPromise
    );

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole("button", {
      name: "Confirm & Post Adjustment",
    });
    fireEvent.click(confirmBtn);

    // Confirm button is disabled and indicates pending state
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByText("Posting Ledger Adjustment...")).toBeInTheDocument();

    // Cancel button is also disabled while pending
    expect(
      screen.getByRole("button", { name: /Cancel \/ Back to Form/i })
    ).toBeDisabled();

    // Resolve mutation
    resolveMutation(mockResponse);

    await waitFor(() => {
      expect(screen.queryByText("Posting Ledger Adjustment...")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 4. Double-Submit Protection
  // ==========================================================================
  it("prevents double-click duplicate mutation dispatches", async () => {
    const mutationSpy = vi
      .spyOn(adminApi, "createAdminFinancialAdjustment")
      .mockResolvedValue(mockResponse);

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole("button", {
      name: "Confirm & Post Adjustment",
    });

    // Rapid double click
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mutationSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 5. Network Ambiguity & Same-Key Retry Preservation
  // ==========================================================================
  it("preserves the original idempotency key on network failure and allows explicit retry with the SAME key", async () => {
    const randomUuidSpy = vi.spyOn(crypto, "randomUUID");

    // First attempt fails with network error (TypeError / fetch failed)
    const networkError = new TypeError("Failed to fetch");
    const mutationSpy = vi
      .spyOn(adminApi, "createAdminFinancialAdjustment")
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(mockResponse);

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole("button", {
      name: "Confirm & Post Adjustment",
    });
    fireEvent.click(confirmBtn);

    // Wait for ambiguous error display
    await waitFor(() => {
      expect(screen.getByTestId("modal-execution-error")).toBeInTheDocument();
      expect(screen.getByText("Ambiguous Network Outcome")).toBeInTheDocument();
    });

    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
    const key1 = randomUuidSpy.mock.results[0]!.value;

    // Retry button appears with clear semantic label
    const retryBtn = screen.getByRole("button", {
      name: "Retry Posting with Same Key",
    });
    expect(retryBtn).toBeInTheDocument();

    // Operator clicks explicit retry
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mutationSpy).toHaveBeenCalledTimes(2);
    });

    // Key MUST NOT have been regenerated; key1 is reused!
    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
    expect(mutationSpy.mock.calls[1]![0]).toEqual(mockPayload);
    expect(mutationSpy.mock.calls[1]![1]).toEqual(key1);
  });

  // ==========================================================================
  // 6. Definitive Backend Error Handling
  // ==========================================================================
  it("displays definitive backend error detail on HTTP 400 or 409", async () => {
    const apiError = new ApiError({
      type: "about:blank",
      status: 409,
      errorCode: "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
      title: "Conflict",
      detail: "Idempotency key was previously used with different parameters",
      timestamp: "2026-09-26T12:00:00Z",
    });

    vi.spyOn(adminApi, "createAdminFinancialAdjustment").mockRejectedValue(apiError);

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole("button", {
      name: "Confirm & Post Adjustment",
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByTestId("modal-execution-error")).toBeInTheDocument();
      expect(screen.getByText("Adjustment Execution Failed")).toBeInTheDocument();
      expect(
        screen.getByText("Idempotency key was previously used with different parameters")
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 7. FROZEN/CLOSED Account Warning Display
  // ==========================================================================
  it("renders lifecycle warning in confirmation modal when source or target account is FROZEN/CLOSED", () => {
    const frozenSource: AccountAdminResponse = {
      ...mockSourceAccount,
      status: "FROZEN",
    };

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        sourceAccount={frozenSource}
        targetAccount={mockTargetAccount}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByTestId("modal-lifecycle-warning")).toBeInTheDocument();
    expect(
      screen.getByText(/One or more selected accounts is currently FROZEN/i)
    ).toBeInTheDocument();
  });

  // ==========================================================================
  // 8. Financial Safety Invariants
  // ==========================================================================
  it("does not mutate or calculate projected balances or fees in the modal", () => {
    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={mockPayload}
        sourceAccount={mockSourceAccount}
        targetAccount={mockTargetAccount}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // No projected balance or fee calculations
    expect(screen.queryByText(/Projected Balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Balance After Adjustment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Calculated Fee/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FX Rate/i)).not.toBeInTheDocument();
  });
});
