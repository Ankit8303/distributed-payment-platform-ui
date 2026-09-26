import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { PaymentStatusCard } from "@/features/payments/components/payment-status-card";
import type { PaymentResponse } from "@/types/payment";

describe("PaymentStatusCard Component", () => {
  const mockSettledPayment: PaymentResponse = {
    paymentId: "123e4567-e89b-12d3-a456-426614174000",
    idempotencyKey: "k1-test-uuid",
    payerAccountId: "acc-payer-1111",
    payeeAccountId: "acc-payee-2222",
    amountMinor: 2500,
    feeAmountMinor: 0,
    currency: "USD",
    status: "SETTLED",
    providerReference: "ref_stripe_mock_123",
    correlationId: "corr-trace-9999",
    createdAt: "2026-09-25T14:30:00Z",
  };

  it("renders authoritative payment details accurately", () => {
    render(<PaymentStatusCard payment={mockSettledPayment} />);

    expect(screen.getByText("123e4567-e89b-12d3-a456-426614174000")).toBeDefined();
    expect(screen.getByText("$25.00")).toBeDefined();
    expect(screen.getByText("acc-payee-2222")).toBeDefined();
    expect(screen.getByText("acc-payer-1111")).toBeDefined();
    expect(screen.getByText("k1-test-uuid")).toBeDefined();
    expect(screen.getByText("ref_stripe_mock_123")).toBeDefined();
    expect(screen.getByText("corr-trace-9999")).toBeDefined();
    expect(screen.queryByTestId("payment-reconciliation-banner")).toBeNull();
  });

  it("renders reconciliation banner when status is PENDING_RECONCILIATION", () => {
    const pendingPayment: PaymentResponse = {
      ...mockSettledPayment,
      status: "PENDING_RECONCILIATION",
      message: "Gateway timed out. Reconciliation active.",
    };

    render(
      <PaymentStatusCard
        payment={pendingPayment}
        isPollingActive={true}
        pollAttemptCount={3}
      />
    );

    const banner = screen.getByTestId("payment-reconciliation-banner");
    expect(banner).toBeDefined();
    expect(banner.textContent).toContain("Payment Reconciliation In Progress");
    expect(banner.textContent).toContain("attempt 3/10");
  });
});
