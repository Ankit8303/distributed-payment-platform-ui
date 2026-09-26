import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RefundStatusBadge } from "@/features/refunds/components/refund-status-badge";
import { ReversalStatusBadge } from "@/features/refunds/components/reversal-status-badge";
import { RefundModal } from "@/features/refunds/components/refund-modal";
import { ReversalModal } from "@/features/refunds/components/reversal-modal";
import { RefundStatusCard } from "@/features/refunds/components/refund-status-card";
import { ReversalStatusCard } from "@/features/refunds/components/reversal-status-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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

describe("Phase F5 Refunds & Reversals Accessibility Audit (WCAG 2.1 AA)", () => {
  it('RefundStatusBadge provides role="status" and distinct semantic aria-label', () => {
    const { rerender } = render(<RefundStatusBadge status="SETTLED" />);
    let badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Refund status: Settled");

    rerender(<RefundStatusBadge status="PENDING_RECONCILIATION" />);
    badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Refund status: Reconciliation In Progress");

    rerender(<RefundStatusBadge status="FAILED" />);
    badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Refund status: Failed");
  });

  it('ReversalStatusBadge provides role="status" and distinct semantic aria-label', () => {
    const { rerender } = render(<ReversalStatusBadge status="COMPLETED" />);
    let badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Reversal status: Completed");

    rerender(<ReversalStatusBadge status="PENDING_RECONCILIATION" />);
    badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Reversal status: Reconciliation In Progress");

    rerender(<ReversalStatusBadge status="FAILED" />);
    badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Reversal status: Failed");
  });

  it("RefundModal supports dialog role, aria-modal, and accessible labels", () => {
    renderWithClient(
      <RefundModal
        isOpen={true}
        paymentId="11111111-1111-1111-1111-111111111111"
        paymentCurrency="USD"
        originalAmountMinor={5000}
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("refund-dialog-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("refund-dialog-description");
  });

  it("ReversalModal supports dialog role, aria-modal, and accessible labels", () => {
    renderWithClient(
      <ReversalModal
        isOpen={true}
        paymentId="22222222-2222-2222-2222-222222222222"
        paymentCurrency="USD"
        originalAmountMinor={5000}
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("reversal-dialog-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("reversal-dialog-description");
  });

  it("RefundStatusCard provides accessible landmark region and aria-label", () => {
    render(
      <RefundStatusCard
        refund={{
          refundId: "ref-1",
          paymentId: "pay-1",
          amountMinor: 2000,
          currency: "USD",
          status: "SETTLED",
          createdAt: new Date().toISOString(),
        }}
      />
    );

    const region = screen.getByRole("region");
    expect(region.getAttribute("aria-label")).toBe("Refund Details");
  });

  it("ReversalStatusCard provides accessible landmark region and aria-label", () => {
    render(
      <ReversalStatusCard
        reversal={{
          reversalId: "rev-1",
          paymentId: "pay-1",
          amountMinor: 5000,
          currency: "USD",
          status: "COMPLETED",
          reason: "Customer dispute",
          createdAt: new Date().toISOString(),
        }}
      />
    );

    const region = screen.getByRole("region");
    expect(region.getAttribute("aria-label")).toBe("Reversal Details");
  });
});
