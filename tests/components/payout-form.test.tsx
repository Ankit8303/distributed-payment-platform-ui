import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PayoutForm } from "@/features/payouts/components/payout-form";
import * as payoutsApi from "@/features/payouts/api/payouts-api";
import type { PayoutResponse } from "@/types/payout";

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

describe("PayoutForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders origin account, amount, currency fields and review button", () => {
    renderWithClient(<PayoutForm />);

    expect(screen.getByLabelText(/Origin Account ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Payout Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument();
    expect(screen.getByTestId("payout-review-button")).toBeInTheDocument();
  });

  it("validates empty and invalid fields client-side", async () => {
    renderWithClient(<PayoutForm />);

    fireEvent.click(screen.getByTestId("payout-review-button"));

    await waitFor(() => {
      expect(screen.getByText(/Origin account ID is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Amount is required/i)).toBeInTheDocument();
    });
  });

  it("opens confirmation dialog displaying authoritative parameters and NO fee fields", async () => {
    renderWithClient(<PayoutForm />);

    fireEvent.change(screen.getByLabelText(/Origin Account ID/i), {
      target: { value: "11111111-1111-1111-1111-111111111111" },
    });
    fireEvent.change(screen.getByLabelText(/Payout Amount/i), {
      target: { value: "150.00" },
    });
    fireEvent.change(screen.getByLabelText(/Currency/i), {
      target: { value: "USD" },
    });

    fireEvent.click(screen.getByTestId("payout-review-button"));

    expect(await screen.findByTestId("payout-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("11111111-1111-1111-1111-111111111111")).toBeInTheDocument();

    // Critical Invariant: No fee details must ever be rendered in payout confirmation
    expect(screen.queryByText(/fee/i)).not.toBeInTheDocument();
  });

  it("submits payout with UUIDv4 idempotency key and navigates to detail route", async () => {
    const mockPayoutResponse: PayoutResponse = {
      payoutId: "22222222-2222-2222-2222-222222222222",
      accountId: "11111111-1111-1111-1111-111111111111",
      amountMinor: 15000,
      currency: "USD",
      status: "SETTLED",
      providerReference: "payout_ref_abc",
      failureReason: null,
      createdAt: new Date().toISOString(),
    };

    const createPayoutSpy = vi
      .spyOn(payoutsApi, "createPayout")
      .mockResolvedValue(mockPayoutResponse);

    renderWithClient(<PayoutForm />);

    fireEvent.change(screen.getByLabelText(/Origin Account ID/i), {
      target: { value: "11111111-1111-1111-1111-111111111111" },
    });
    fireEvent.change(screen.getByLabelText(/Payout Amount/i), {
      target: { value: "150.00" },
    });

    fireEvent.click(screen.getByTestId("payout-review-button"));

    expect(await screen.findByTestId("payout-confirm-submit-button")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("payout-confirm-submit-button"));

    await waitFor(() => {
      expect(createPayoutSpy).toHaveBeenCalledTimes(1);
      const args = createPayoutSpy.mock.calls[0];
      expect(args![0]).toEqual({
        accountId: "11111111-1111-1111-1111-111111111111",
        amountMinor: 15000,
        currency: "USD",
      });
      expect(args![1]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/payouts/22222222-2222-2222-2222-222222222222");
    });
  });
});
