import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PayoutStatusBadge } from "@/features/payouts/components/payout-status-badge";
import { PayoutConfirmDialog } from "@/features/payouts/components/payout-confirm-dialog";
import { PayoutStatusCard } from "@/features/payouts/components/payout-status-card";
import { PayoutForm } from "@/features/payouts/components/payout-form";

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

describe("Phase F5 Payouts Accessibility Audit (WCAG 2.1 AA)", () => {
  it('PayoutStatusBadge provides role="status" and distinct semantic aria-label', () => {
    const { rerender } = render(<PayoutStatusBadge status="SETTLED" />);
    let badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Payout status: Settled");

    rerender(<PayoutStatusBadge status="PENDING_RECONCILIATION" />);
    badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Payout status: Reconciliation In Progress");

    rerender(<PayoutStatusBadge status="FAILED" />);
    badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Payout status: Failed");
  });

  it("PayoutConfirmDialog supports dialog role, aria-modal, and accessible labels", () => {
    render(
      <PayoutConfirmDialog
        isOpen={true}
        accountId="33333333-3333-3333-3333-333333333333"
        amountMinor={7500}
        currency="USD"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("payout-confirm-dialog-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("payout-confirm-dialog-description");
  });

  it("PayoutStatusCard provides accessible landmark region and aria-label", () => {
    render(
      <PayoutStatusCard
        payout={{
          payoutId: "payout-999",
          accountId: "account-888",
          amountMinor: 50000,
          currency: "USD",
          status: "SETTLED",
          createdAt: new Date().toISOString(),
        }}
      />
    );

    const region = screen.getByRole("region");
    expect(region.getAttribute("aria-label")).toBe("Payout Details");
  });

  it("PayoutForm renders with accessible form label and input associations", () => {
    renderWithClient(<PayoutForm />);

    const form = screen.getByRole("form", { name: /Create Payout Form/i });
    expect(form).toBeInTheDocument();
    expect(screen.getByLabelText(/Origin Account ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Payout Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument();
  });
});
