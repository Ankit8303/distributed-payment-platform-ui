import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountTable } from "@/features/admin/components/account-table";
import { AccountFilters } from "@/features/admin/components/account-filters";
import { AccountPagination } from "@/features/admin/components/account-pagination";
import { AccountAdminStatusBadge } from "@/features/admin/components/account-status-badge";
import type { AccountAdminResponse } from "@/types/admin";

const mockAccounts: AccountAdminResponse[] = [
  {
    id: "acc-11111111-2222-3333-4444-555555555555",
    accountNumber: "ACCT-1111-USD",
    ownerId: "usr-11111111-2222-3333-4444-555555555555",
    accountType: "CUSTOMER",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 250000,
    version: 1,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  },
  {
    id: "acc-22222222-3333-4444-5555-666666666666",
    accountNumber: "ACCT-2222-EUR",
    ownerId: "usr-22222222-3333-4444-5555-666666666666",
    accountType: "MERCHANT",
    currency: "EUR",
    status: "FROZEN",
    materializedBalanceMinor: 150000,
    version: 2,
    createdAt: "2026-09-05T12:00:00Z",
    updatedAt: "2026-09-20T14:30:00Z",
  },
];

describe("Phase F7-G-B Admin Account Explorer Accessibility Audit", () => {
  it("provides semantic table structure with scope='col' headers", () => {
    render(<AccountTable accounts={mockAccounts} />);

    const table = screen.getByTestId("admin-accounts-table");
    expect(table.tagName.toLowerCase()).toBe("table");

    const colHeaders = screen.getAllByRole("columnheader");
    expect(colHeaders.length).toBe(9);
    colHeaders.forEach((th) => {
      expect(th).toHaveAttribute("scope", "col");
    });
  });

  it("exposes aria-sort on sortable column headers", () => {
    render(<AccountTable accounts={mockAccounts} sort="createdAt,desc" />);

    const colHeaders = screen.getAllByRole("columnheader");
    const createdHeader = colHeaders.find((th) => th.textContent?.includes("Created"));
    expect(createdHeader).toHaveAttribute("aria-sort", "descending");

    const accountNumHeader = colHeaders.find((th) => th.textContent?.includes("Account Number"));
    expect(accountNumHeader).toHaveAttribute("aria-sort", "none");
  });

  it("provides form labels associated with filter inputs", () => {
    render(
      <AccountFilters
        onApply={() => {}}
        onReset={() => {}}
      />
    );

    // In default owner mode
    const ownerInput = screen.getByLabelText(/Owner Identifier/i);
    expect(ownerInput).toHaveAttribute("id", "filter-owner-id");
  });

  it("provides accessible tablist navigation for filter modes", () => {
    render(
      <AccountFilters
        onApply={() => {}}
        onReset={() => {}}
      />
    );

    const tablist = screen.getByRole("tablist", { name: /Account filter dimensions/i });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("provides accessible status badges with text labels and aria-labels", () => {
    render(
      <div>
        <AccountAdminStatusBadge status="ACTIVE" />
        <AccountAdminStatusBadge status="FROZEN" />
        <AccountAdminStatusBadge status="CLOSED" />
      </div>
    );

    const badges = screen.getAllByTestId("account-status-badge");
    expect(badges.length).toBe(3);

    expect(screen.getByLabelText("Account Status: Active")).toBeInTheDocument();
    expect(screen.getByLabelText("Account Status: Frozen")).toBeInTheDocument();
    expect(screen.getByLabelText("Account Status: Closed")).toBeInTheDocument();
  });

  it("provides accessible pagination landmarks and button labels", () => {
    render(
      <AccountPagination
        page={0}
        totalPages={5}
        totalElements={100}
        size={20}
        onPageChange={() => {}}
        onSizeChange={() => {}}
      />
    );

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    expect(screen.getByLabelText("Per page:")).toHaveValue("20");
  });
});
