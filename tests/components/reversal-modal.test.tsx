import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReversalModal } from "@/features/refunds/components/reversal-modal";
import * as refundsApi from "@/features/refunds/api/refunds-api";
import type { ReversalResponse } from "@/types/reversal";

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

describe("ReversalModal Component", () => {
  const paymentId = "77777777-7777-7777-7777-777777777777";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders reversal modal with full payment messaging and NO amount input", () => {
    renderWithClient(
      <ReversalModal
        isOpen={true}
        paymentId={paymentId}
        paymentCurrency="USD"
        originalAmountMinor={5000}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("reversal-modal")).toBeInTheDocument();
    // Invariant: Full payment reversal has NO amount input field
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Full original payment amount: \$50\.00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for Reversal/i)).toBeInTheDocument();
    expect(screen.getByTestId("reversal-review-button")).toBeInTheDocument();
  });

  it("requires a mandatory reason before proceeding", async () => {
    renderWithClient(
      <ReversalModal
        isOpen={true}
        paymentId={paymentId}
        paymentCurrency="USD"
        originalAmountMinor={5000}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("reversal-review-button"));
    expect(await screen.findByTestId("reversal-error-alert")).toBeInTheDocument();
  });

  it("advances to confirmation and submits full reversal with UUIDv4 key", async () => {
    const mockReversalResponse: ReversalResponse = {
      reversalId: "88888888-8888-8888-8888-888888888888",
      paymentId,
      amountMinor: 5000,
      currency: "USD",
      status: "COMPLETED",
      reason: "Suspected unauthorized charge",
      compensatingLedgerTransactionId: "99999999-9999-9999-9999-999999999999",
      failureReason: null,
      createdAt: new Date().toISOString(),
    };

    const createReversalSpy = vi
      .spyOn(refundsApi, "createReversal")
      .mockResolvedValue(mockReversalResponse);

    renderWithClient(
      <ReversalModal
        isOpen={true}
        paymentId={paymentId}
        paymentCurrency="USD"
        originalAmountMinor={5000}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Reason for Reversal/i), {
      target: { value: "Suspected unauthorized charge" },
    });

    fireEvent.click(screen.getByTestId("reversal-review-button"));

    expect(await screen.findByTestId("reversal-confirm-submit-button")).toBeInTheDocument();
    expect(screen.getByText("Suspected unauthorized charge")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("reversal-confirm-submit-button"));

    await waitFor(() => {
      expect(createReversalSpy).toHaveBeenCalledTimes(1);
      const args = createReversalSpy.mock.calls[0];
      expect(args![0]).toBe(paymentId);
      expect(args![1]).toEqual({ reason: "Suspected unauthorized charge" });
      expect(args![2]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/reversals/88888888-8888-8888-8888-888888888888");
    });
  });
});
