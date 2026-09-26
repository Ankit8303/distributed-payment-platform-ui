import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RefundModal } from "@/features/refunds/components/refund-modal";
import * as refundsApi from "@/features/refunds/api/refunds-api";
import type { RefundResponse } from "@/types/refund";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("RefundModal Component", () => {
  const paymentId = "44444444-4444-4444-4444-444444444444";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal with amount and optional reason inputs", () => {
    renderWithClient(
      <RefundModal
        isOpen={true}
        paymentId={paymentId}
        paymentCurrency="USD"
        originalAmountMinor={5000}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("refund-modal")).toBeInTheDocument();
    expect(screen.getByLabelText(/Refund Amount \(USD\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByTestId("refund-review-button")).toBeInTheDocument();
  });

  it("advances to confirmation step and submits with idempotency key", async () => {
    const mockRefundResponse: RefundResponse = {
      refundId: "55555555-5555-5555-5555-555555555555",
      paymentId,
      amountMinor: 2500,
      currency: "USD",
      status: "SETTLED",
      reason: "Item returned",
      providerReference: "ref_123",
      compensatingLedgerTransactionId: "66666666-6666-6666-6666-666666666666",
      failureReason: null,
      createdAt: new Date().toISOString(),
    };

    const createRefundSpy = vi
      .spyOn(refundsApi, "createRefund")
      .mockResolvedValue(mockRefundResponse);

    renderWithClient(
      <RefundModal
        isOpen={true}
        paymentId={paymentId}
        paymentCurrency="USD"
        originalAmountMinor={5000}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Refund Amount \(USD\)/i), {
      target: { value: "25.00" },
    });
    fireEvent.change(screen.getByLabelText(/Reason \(Optional\)/i), {
      target: { value: "Item returned" },
    });

    fireEvent.click(screen.getByTestId("refund-review-button"));

    // Confirmation view should display formatted amount
    expect(await screen.findByText("$25.00")).toBeInTheDocument();
    expect(screen.getByTestId("refund-confirm-submit-button")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("refund-confirm-submit-button"));

    await waitFor(() => {
      expect(createRefundSpy).toHaveBeenCalledTimes(1);
      const callArgs = createRefundSpy.mock.calls[0];
      expect(callArgs![0]).toBe(paymentId);
      expect(callArgs![1]).toEqual({ amountMinor: 2500, reason: "Item returned" });
      // UUIDv4 format idempotency key
      expect(callArgs![2]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/refunds/55555555-5555-5555-5555-555555555555");
    });
  });

  it("displays validation error when amount is invalid", async () => {
    renderWithClient(
      <RefundModal
        isOpen={true}
        paymentId={paymentId}
        paymentCurrency="USD"
        originalAmountMinor={5000}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Refund Amount \(USD\)/i), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByTestId("refund-review-button"));

    expect(await screen.findByTestId("refund-error-alert")).toBeInTheDocument();
  });
});
