import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PayoutStatusCard } from "@/features/payouts/components/payout-status-card";
import type { PayoutResponse } from "@/types/payout";

describe("PayoutStatusCard Component", () => {
  const mockPayout: PayoutResponse = {
    payoutId: "payout-0001-0002-0003-000000000004",
    accountId: "account-1111-2222-3333-444444444444",
    amountMinor: 80000,
    currency: "USD",
    status: "SETTLED",
    providerReference: "bank_disburse_888",
    failureReason: null,
    createdAt: "2026-09-26T15:00:00Z",
  };

  it("renders authoritative payout disburse details and NO fee display", () => {
    render(<PayoutStatusCard payout={mockPayout} />);

    expect(screen.getByTestId("payout-status-card")).toBeInTheDocument();
    expect(screen.getByText("payout-0001-0002-0003-000000000004")).toBeInTheDocument();
    expect(screen.getByText("$800.00")).toBeInTheDocument();
    expect(screen.getByText("Settled")).toBeInTheDocument();
    expect(screen.getByText("bank_disburse_888")).toBeInTheDocument();
    expect(screen.getByText(/New Payout/i)).toBeInTheDocument();

    // Invariant: No fee details in payout status card
    expect(screen.queryByText(/fee/i)).not.toBeInTheDocument();
  });

  it("renders reconciliation banner when payout is PENDING_RECONCILIATION", () => {
    const pendingPayout: PayoutResponse = {
      ...mockPayout,
      status: "PENDING_RECONCILIATION",
    };

    render(
      <PayoutStatusCard
        payout={pendingPayout}
        isPollingActive={true}
        pollAttemptCount={1}
      />
    );

    expect(screen.getByTestId("payment-reconciliation-banner")).toBeInTheDocument();
  });
});
