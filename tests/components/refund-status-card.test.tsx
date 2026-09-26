import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RefundStatusCard } from "@/features/refunds/components/refund-status-card";
import type { RefundResponse } from "@/types/refund";

describe("RefundStatusCard Component", () => {
  const mockRefund: RefundResponse = {
    refundId: "refund-1111-2222-3333-444444444444",
    paymentId: "payment-5555-6666-7777-888888888888",
    amountMinor: 3500,
    currency: "USD",
    status: "SETTLED",
    reason: "Damaged item returned",
    providerReference: "prov-ref-999",
    compensatingLedgerTransactionId: "comp-tx-0001",
    failureReason: null,
    createdAt: "2026-09-26T14:00:00Z",
  };

  it("renders authoritative refund receipt with amount, status, and IDs", () => {
    render(<RefundStatusCard refund={mockRefund} />);

    expect(screen.getByTestId("refund-status-card")).toBeInTheDocument();
    expect(screen.getByText("refund-1111-2222-3333-444444444444")).toBeInTheDocument();
    expect(screen.getByText("$35.00")).toBeInTheDocument();
    expect(screen.getByText("Settled")).toBeInTheDocument();
    expect(screen.getByText("comp-tx-0001")).toBeInTheDocument();
    expect(screen.getByText("Damaged item returned")).toBeInTheDocument();
    expect(screen.getByText(/Back to Payment/i)).toBeInTheDocument();
  });

  it("renders reconciliation banner when refund is PENDING_RECONCILIATION", () => {
    const pendingRefund: RefundResponse = {
      ...mockRefund,
      status: "PENDING_RECONCILIATION",
    };

    render(
      <RefundStatusCard
        refund={pendingRefund}
        isPollingActive={true}
        pollAttemptCount={2}
      />
    );

    expect(screen.getByTestId("payment-reconciliation-banner")).toBeInTheDocument();
  });
});
