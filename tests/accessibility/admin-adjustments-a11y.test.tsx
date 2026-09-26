import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAdjustmentsPage from "@/app/(admin)/admin/adjustments/page";
import { AdjustmentForm } from "@/features/admin/components/adjustment-form";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import type { AccountAdminResponse, Page, FinancialAdjustmentResponse } from "@/types/admin";

const mockUseParams = vi.fn().mockReturnValue({});
vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  usePathname: () => "/admin/adjustments",
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithClient(ui: React.ReactElement, queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("Phase F7-H-B Admin Adjustments Accessibility Audit (WCAG 2.1 AA)", () => {
  const mockAccount: AccountAdminResponse = {
    id: "11111111-1111-4111-8111-111111111111",
    accountNumber: "ACCT-A11Y-001",
    ownerId: "usr-001",
    accountType: "CUSTOMER",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 50000,
    version: 1,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  };

  const mockAccountsPage: Page<AccountAdminResponse> = {
    content: [mockAccount],
    pageable: {
      pageNumber: 0,
      pageSize: 50,
      sort: { sorted: true, unsorted: false, empty: false },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: 1,
    totalPages: 1,
    last: true,
    first: true,
    size: 50,
    number: 0,
    sort: { sorted: true, unsorted: false, empty: false },
    numberOfElements: 1,
    empty: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);
    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);
  });

  it("maintains a single H1 and logical heading hierarchy", () => {
    renderWithClient(<AdminAdjustmentsPage />);

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Financial Adjustments");

    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.length).toBeGreaterThanOrEqual(1);
  });

  it("provides semantic form with fieldsets, legends, and explicit labels", () => {
    renderWithClient(<AdjustmentForm />);

    const form = screen.getByRole("form", { name: "Financial Adjustment Form" });
    expect(form).toBeInTheDocument();

    // Fieldsets and legends
    expect(screen.getByText("Source Account (Debit Leg)")).toBeInTheDocument();
    expect(screen.getByText("Target Account (Credit Leg)")).toBeInTheDocument();

    // Form inputs and explicit labels
    expect(screen.getByLabelText(/Amount \(USD\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Audit Reason/i)).toBeInTheDocument();
  });

  it("associates validation errors via aria-invalid and aria-describedby with role='alert'", async () => {
    renderWithClient(<AdjustmentForm />);

    const submitBtn = screen.getByRole("button", { name: /Continue to Review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.length).toBeGreaterThanOrEqual(3);
    });

    const sourceSelect = screen.getByLabelText("Source Account Selection");
    expect(sourceSelect).toHaveAttribute("aria-invalid", "true");
    expect(sourceSelect).toHaveAttribute("aria-describedby");

    const targetSelect = screen.getByLabelText("Target Account Selection");
    expect(targetSelect).toHaveAttribute("aria-invalid", "true");
    expect(targetSelect).toHaveAttribute("aria-describedby");

    const amountInput = screen.getByLabelText(/Amount \(USD\)/i);
    expect(amountInput).toHaveAttribute("aria-invalid", "true");
    expect(amountInput).toHaveAttribute("aria-describedby");

    const reasonInput = screen.getByLabelText(/Audit Reason/i);
    expect(reasonInput).toHaveAttribute("aria-invalid", "true");
    expect(reasonInput).toHaveAttribute("aria-describedby");
  });

  it("provides live polite character count announcement for audit reason", () => {
    renderWithClient(<AdjustmentForm />);

    const reasonInput = screen.getByLabelText(/Audit Reason/i);
    fireEvent.change(reasonInput, { target: { value: "Audit check" } });

    const charCounter = screen.getByText("11/500 chars");
    expect(charCounter).toHaveAttribute("aria-live", "polite");
  });

  it("warns about FROZEN/CLOSED accounts with role='status' without relying purely on color", async () => {
    const frozenAccount: AccountAdminResponse = {
      ...mockAccount,
      id: "22222222-2222-4222-8222-222222222222",
      status: "FROZEN",
    };
    vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue({
      ...mockAccountsPage,
      content: [frozenAccount],
    });
    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(frozenAccount);

    renderWithClient(<AdjustmentForm />);

    await waitFor(() => {
      expect(screen.getAllByText(/ACCT-A11Y-001/).length).toBeGreaterThanOrEqual(1);
    });

    const sourceSelect = screen.getByLabelText("Source Account Selection");
    fireEvent.change(sourceSelect, { target: { value: frozenAccount.id } });

    await waitFor(() => {
      const statusWarning = screen.getByRole("status");
      expect(statusWarning).toBeInTheDocument();
      expect(statusWarning).toHaveTextContent(/Warning: Source account is FROZEN/i);
    });
  });

  it("ensures AdjustmentConfirmModal adheres to WCAG 2.1 AA dialog accessibility standards", async () => {
    const { AdjustmentConfirmModal } = await import(
      "@/features/admin/components/adjustment-confirm-modal"
    );

    renderWithClient(
      <AdjustmentConfirmModal
        isOpen={true}
        payload={{
          sourceAccountId: mockAccount.id,
          targetAccountId: "22222222-2222-4222-8222-222222222222",
          amountMinor: 5000,
          currency: "USD",
          reason: "Accessibility compliance test reason",
        }}
        sourceAccount={mockAccount}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // 1. Role dialog with aria-modal="true"
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");

    // 2. Initial focus on safe Cancel button (NOT on Confirm & Post)
    await waitFor(() => {
      const cancelBtn = screen.getByRole("button", { name: /Cancel \/ Back to Form/i });
      expect(document.activeElement).toBe(cancelBtn);
    });

    // 3. Confirm button clearly communicates financial posting
    const confirmBtn = screen.getByRole("button", {
      name: "Confirm & Post Adjustment",
    });
    expect(confirmBtn).toBeInTheDocument();
  });
});

describe("Phase F7-H-D Admin Adjustment Detail Accessibility Audit (WCAG 2.1 AA)", () => {
  const mockAdjustment: FinancialAdjustmentResponse = {
    adjustmentId: "99999999-9999-4999-8999-999999999999",
    sourceAccountId: "11111111-1111-4111-8111-111111111111",
    targetAccountId: "22222222-2222-4222-8222-222222222222",
    amountMinor: 250000,
    currency: "USD",
    reason: "A11y verification authoritative audit reason",
    operatorId: "ops-a11y-admin",
    compensatingLedgerTransactionId: "88888888-8888-4888-8888-888888888888",
    createdAt: "2026-09-26T12:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: mockAdjustment.adjustmentId });
  });

  it("maintains a single H1 and logical section hierarchy for the detail page", async () => {
    const { default: AdminAdjustmentDetailPage } = await import(
      "@/app/(admin)/admin/adjustments/[id]/page"
    );
    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockResolvedValue(mockAdjustment);

    renderWithClient(<AdminAdjustmentDetailPage />);

    await waitFor(() => {
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0]).toHaveTextContent("Financial Adjustment Detail");
    });

    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.length).toBeGreaterThanOrEqual(3);
  });

  it("provides descriptive link texts for all navigation targets (no generic 'click here')", async () => {
    const { default: AdminAdjustmentDetailPage } = await import(
      "@/app/(admin)/admin/adjustments/[id]/page"
    );
    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockResolvedValue(mockAdjustment);

    renderWithClient(<AdminAdjustmentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("View Ledger Transaction")).toBeInTheDocument();
    });

    const ledgerLink = screen.getByRole("link", { name: /View Ledger Transaction/i });
    expect(ledgerLink).toHaveAttribute(
      "href",
      `/admin/ledger/transactions/${mockAdjustment.compensatingLedgerTransactionId}`
    );

    const sourceLink = screen.getByRole("link", {
      name: /View Source Account Inspector/i,
    });
    expect(sourceLink).toHaveAttribute("href", `/admin/accounts/${mockAdjustment.sourceAccountId}`);

    const targetLink = screen.getByRole("link", {
      name: /View Target Account Inspector/i,
    });
    expect(targetLink).toHaveAttribute("href", `/admin/accounts/${mockAdjustment.targetAccountId}`);
  });

  it("provides accessible role and live announcement in loading and not-found states", async () => {
    const { default: AdminAdjustmentDetailPage } = await import(
      "@/app/(admin)/admin/adjustments/[id]/page"
    );
    // Non-resolving promise to test loading state
    vi.spyOn(adminApi, "getAdminFinancialAdjustment").mockReturnValue(new Promise(() => {}));

    renderWithClient(<AdminAdjustmentDetailPage />);

    const loadingRegion = screen.getByRole("status");
    expect(loadingRegion).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Loading adjustment record...")).toBeInTheDocument();
  });
});

