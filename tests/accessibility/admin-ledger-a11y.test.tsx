import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LedgerTransactionTable } from "@/features/admin/components/ledger-transaction-table";
import { LedgerPagination } from "@/features/admin/components/ledger-pagination";
import { LedgerFilters } from "@/features/admin/components/ledger-filters";
import type { LedgerTransactionAdminResponse } from "@/types/admin";

const mockTransactions: LedgerTransactionAdminResponse[] = [
  {
    id: "ltx-11111111-2222-3333-4444-555555555555",
    sourceReferenceId: "pay-11111111-2222-3333-4444-555555555555",
    sourceReferenceType: "PAYMENT",
    description: "Payment Settlement",
    createdAt: "2026-09-26T10:00:00Z",
    entries: [
      {
        id: "ent-001",
        accountId: "acc-payer-001",
        direction: "DEBIT",
        amountMinor: 25000,
        currency: "USD",
        sequenceNumber: 1,
        createdAt: "2026-09-26T10:00:00Z",
      },
    ],
  },
];

describe("Phase F7-F Standalone Ledger Exploration Accessibility Audit (WCAG 2.1 AA)", () => {
  it("provides semantic table structure with scope='col' headers on ledger transaction table", () => {
    render(<LedgerTransactionTable transactions={mockTransactions} />);

    const table = screen.getByTestId("admin-ledger-transactions-table");
    expect(table.tagName.toLowerCase()).toBe("table");

    const colHeaders = screen.getAllByRole("columnheader");
    expect(colHeaders.length).toBeGreaterThanOrEqual(6);
    colHeaders.forEach((th) => {
      expect(th).toHaveAttribute("scope", "col");
    });
  });

  it("provides accessible navigation landmark for ledger pagination", () => {
    render(
      <LedgerPagination
        page={0}
        totalPages={5}
        totalElements={100}
        size={20}
        itemLabel="transactions"
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

  it("provides accessible form controls with associated labels in ledger filters", () => {
    render(
      <LedgerFilters
        onApply={() => {}}
        onReset={() => {}}
      />
    );

    const sourceSelect = screen.getByLabelText("Source Reference Type");
    expect(sourceSelect).toBeInTheDocument();
    expect(sourceSelect).toHaveAttribute("id", "filter-source-reference-type");
  });
});
