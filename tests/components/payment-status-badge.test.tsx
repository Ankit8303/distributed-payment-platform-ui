import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge";

describe("PaymentStatusBadge Component", () => {
  it("renders SETTLED status with accessible label and icon", () => {
    render(<PaymentStatusBadge status="SETTLED" />);
    const badge = screen.getByTestId("payment-status-badge");
    expect(badge.textContent).toContain("Settled");
    expect(badge.getAttribute("aria-label")).toContain("Settled");
  });

  it("renders PENDING_RECONCILIATION status", () => {
    render(<PaymentStatusBadge status="PENDING_RECONCILIATION" />);
    const badge = screen.getByTestId("payment-status-badge");
    expect(badge.textContent).toContain("Reconciliation In Progress");
    expect(badge.getAttribute("aria-label")).toContain("Reconciliation In Progress");
  });

  it("renders DECLINED and FAILED statuses", () => {
    const { rerender } = render(<PaymentStatusBadge status="DECLINED" />);
    expect(screen.getByTestId("payment-status-badge").textContent).toContain("Declined");

    rerender(<PaymentStatusBadge status="FAILED" />);
    expect(screen.getByTestId("payment-status-badge").textContent).toContain("Failed");
  });

  it("renders Processing for in-flight states", () => {
    render(<PaymentStatusBadge status="AUTHORIZING" />);
    const badge = screen.getByTestId("payment-status-badge");
    expect(badge.textContent).toContain("Processing");
  });

  it("safely falls back to Status Unknown for unrecognized status", () => {
    render(<PaymentStatusBadge status="UNEXPECTED_STATUS" />);
    const badge = screen.getByTestId("payment-status-badge");
    expect(badge.textContent).toContain("Status Unknown");
  });
});
