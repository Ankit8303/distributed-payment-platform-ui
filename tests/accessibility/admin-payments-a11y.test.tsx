import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentTable } from "@/features/admin/components/payment-table";
import { PaymentFilters } from "@/features/admin/components/payment-filters";
import { PaymentPagination } from "@/features/admin/components/payment-pagination";
import { PaymentAdminStatusBadge } from "@/features/admin/components/payment-status-badge";
import type { PaymentAdminResponse } from "@/types/admin";

const mockPayments: PaymentAdminResponse[] = [
  {
    id: "pay-11111111-2222-3333-4444-555555555555",
    payerAccountId: "acc-payer-001",
    payeeAccountId: "acc-payee-001",
    amountMinor: 5000,
    feeMinor: 25,
    currency: "USD",
    status: "SETTLED",
    providerReference: "prov-123",
    idempotencyKey: "idem-123",
    idempotencyScope: "GLOBAL",
    createdAt: "2026-09-26T10:00:00Z",
    updatedAt: "2026-09-26T10:01:00Z",
  },
  {
    id: "pay-22222222-3333-4444-5555-666666666666",
    payerAccountId: "acc-payer-002",
    payeeAccountId: "acc-payee-002",
    amountMinor: 10000,
    feeMinor: 50,
    currency: "USD",
    status: "FAILED",
    providerReference: "prov-456",
    idempotencyKey: "idem-456",
    idempotencyScope: null,
    createdAt: "2026-09-26T10:05:00Z",
    updatedAt: "2026-09-26T10:06:00Z",
  },
];

describe("Phase F7-D Admin Payment Operations Accessibility Audit", () => {
  it("provides semantic table structure with scope='col' headers", () => {
    render(<PaymentTable payments={mockPayments} />);

    const table = screen.getByTestId("admin-payments-table");
    expect(table.tagName.toLowerCase()).toBe("table");

    const colHeaders = screen.getAllByRole("columnheader");
    expect(colHeaders.length).toBeGreaterThanOrEqual(8);
    colHeaders.forEach((th) => {
      expect(th).toHaveAttribute("scope", "col");
    });
  });

  it("provides form labels associated with filter inputs", () => {
    render(
      <PaymentFilters
        onApply={() => {}}
        onReset={() => {}}
      />
    );

    const statusLabel = screen.getByLabelText("Payment Status");
    expect(statusLabel).toBeInTheDocument();

    const payerLabel = screen.getByLabelText("Payer Account ID");
    expect(payerLabel).toBeInTheDocument();

    const payeeLabel = screen.getByLabelText("Payee Account ID");
    expect(payeeLabel).toBeInTheDocument();
  });

  it("provides accessible navigation landmark for pagination", () => {
    render(
      <PaymentPagination
        page={0}
        totalPages={5}
        totalElements={100}
        size={20}
        onPageChange={() => {}}
      />
    );

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toBeInTheDocument();

    const prevBtn = screen.getByRole("button", { name: "Previous page" });
    const nextBtn = screen.getByRole("button", { name: "Next page" });
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
  });

  it("conveys payment status via text and ARIA semantics alongside visual styling", () => {
    render(
      <div>
        <PaymentAdminStatusBadge status="SETTLED" />
        <PaymentAdminStatusBadge status="FAILED" />
        <PaymentAdminStatusBadge status="PENDING_RECONCILIATION" />
      </div>
    );

    const statusBadges = screen.getAllByRole("status");
    expect(statusBadges).toHaveLength(3);

    expect(statusBadges[0]).toHaveAttribute("aria-label", "Status: Settled");
    expect(statusBadges[1]).toHaveAttribute("aria-label", "Status: Failed");
    expect(statusBadges[2]).toHaveAttribute(
      "aria-label",
      "Status: Pending Reconciliation"
    );
  });
});
