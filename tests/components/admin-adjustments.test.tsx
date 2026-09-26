import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAdjustmentsPage from "@/app/(admin)/admin/adjustments/page";
import { AdjustmentForm } from "@/features/admin/components/adjustment-form";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import type { AccountAdminResponse, Page } from "@/types/admin";

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

describe("Phase F7-H-B Admin Financial Adjustment Workspace & Form Component", () => {
  const sourceUuid = "11111111-1111-4111-8111-111111111111";
  const targetUuid = "22222222-2222-4222-8222-222222222222";
  const frozenUuid = "33333333-3333-4333-8333-333333333333";
  const closedUuid = "44444444-4444-4444-8444-444444444444";
  const eurUuid = "55555555-5555-4555-8555-555555555555";

  const mockSourceAccount: AccountAdminResponse = {
    id: sourceUuid,
    accountNumber: "ACCT-SOURCE-USD",
    ownerId: "owner-101",
    accountType: "INTERNAL_SETTLEMENT",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 1000000,
    version: 1,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  };

  const mockTargetAccount: AccountAdminResponse = {
    id: targetUuid,
    accountNumber: "ACCT-TARGET-USD",
    ownerId: "owner-202",
    accountType: "CUSTOMER",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 250000,
    version: 2,
    createdAt: "2026-09-02T10:00:00Z",
    updatedAt: "2026-09-02T10:00:00Z",
  };

  const mockFrozenAccount: AccountAdminResponse = {
    ...mockSourceAccount,
    id: frozenUuid,
    accountNumber: "ACCT-FROZEN-USD",
    status: "FROZEN",
  };

  const mockClosedAccount: AccountAdminResponse = {
    ...mockTargetAccount,
    id: closedUuid,
    accountNumber: "ACCT-CLOSED-USD",
    status: "CLOSED",
  };

  const mockEurAccount: AccountAdminResponse = {
    ...mockTargetAccount,
    id: eurUuid,
    accountNumber: "ACCT-TARGET-EUR",
    currency: "EUR",
  };

  const mockAccountsPage: Page<AccountAdminResponse> = {
    content: [
      mockSourceAccount,
      mockTargetAccount,
      mockFrozenAccount,
      mockClosedAccount,
      mockEurAccount,
    ],
    pageable: {
      pageNumber: 0,
      pageSize: 50,
      sort: { sorted: true, unsorted: false, empty: false },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: 5,
    totalPages: 1,
    last: true,
    first: true,
    size: 50,
    number: 0,
    sort: { sorted: true, unsorted: false, empty: false },
    numberOfElements: 5,
    empty: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(mockAccountsPage);
    vi.spyOn(adminApi, "getAdminAccount").mockImplementation((id: string) => {
      const match = mockAccountsPage.content.find((acc) => acc.id === id);
      return Promise.resolve(match || mockSourceAccount);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function renderAdjustmentForm(ui: React.ReactElement = <AdjustmentForm />) {
    const result = renderWithClient(ui);
    await waitFor(() => {
      expect(screen.getAllByText(/ACCT-SOURCE-USD/).length).toBeGreaterThanOrEqual(2);
    });
    return result;
  }

  // ==========================================================================
  // 1. Workspace & Form Rendering
  // ==========================================================================
  describe("Workspace & Form Rendering", () => {
    it("renders the adjustments workspace with H1 and administrative safety notice", async () => {
      renderWithClient(<AdminAdjustmentsPage />);

      expect(
        screen.getByRole("heading", { name: "Financial Adjustments", level: 1 })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Administrative Financial Adjustment Workspace \(Phase F7-H-B\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No mutation is executed and no idempotency key is generated in this phase/i)
      ).toBeInTheDocument();
    });

    it("renders all required form input fields, labels, and action buttons", () => {
      renderWithClient(<AdjustmentForm />);

      expect(screen.getByRole("form", { name: "Financial Adjustment Form" })).toBeInTheDocument();
      expect(screen.getByText("Source Account (Debit Leg)")).toBeInTheDocument();
      expect(screen.getByText("Target Account (Credit Leg)")).toBeInTheDocument();
      expect(screen.getByText("Adjustment Currency")).toBeInTheDocument();
      expect(screen.getByLabelText(/Amount \(USD\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Audit Reason/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Continue to Review/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
      expect(screen.getByText(/Step 1 of 2: Prepare & Validate Payload/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 2. Account Selection & Context Display
  // ==========================================================================
  describe("Account Selection & Context Display", () => {
    it("displays authoritative source and target account context cards upon selection", async () => {
      await renderAdjustmentForm(<AdjustmentForm />);

      // Select Source Account
      const sourceSelect = screen.getByLabelText("Source Account Selection");
      fireEvent.change(sourceSelect, { target: { value: sourceUuid } });

      await waitFor(() => {
        expect(screen.getByTestId("source-account-card")).toBeInTheDocument();
      });

      const sourceCard = screen.getByTestId("source-account-card");
      expect(within(sourceCard).getByText("ACCT-SOURCE-USD")).toBeInTheDocument();
      expect(within(sourceCard).getByText(sourceUuid)).toBeInTheDocument();
      expect(within(sourceCard).getByText("INTERNAL_SETTLEMENT")).toBeInTheDocument();
      expect(within(sourceCard).getByText("$10,000.00")).toBeInTheDocument(); // formatted 1000000 minor units

      // Select Target Account
      const targetSelect = screen.getByLabelText("Target Account Selection");
      fireEvent.change(targetSelect, { target: { value: targetUuid } });

      await waitFor(() => {
        expect(screen.getByTestId("target-account-card")).toBeInTheDocument();
      });

      const targetCard = screen.getByTestId("target-account-card");
      expect(within(targetCard).getByText("ACCT-TARGET-USD")).toBeInTheDocument();
      expect(within(targetCard).getByText(targetUuid)).toBeInTheDocument();
      expect(within(targetCard).getByText("CUSTOMER")).toBeInTheDocument();
      expect(within(targetCard).getByText("$2,500.00")).toBeInTheDocument(); // formatted 250000 minor units
    });

    it("displays prominent warning when source account is FROZEN without blocking form", async () => {
      await renderAdjustmentForm(<AdjustmentForm />);

      const sourceSelect = screen.getByLabelText("Source Account Selection");
      fireEvent.change(sourceSelect, { target: { value: frozenUuid } });

      await waitFor(() => {
        expect(screen.getByTestId("source-frozen-warning")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Warning: Source account is FROZEN\. Review the account status carefully/i)
      ).toBeInTheDocument();
    });

    it("displays prominent warning when target account is CLOSED without blocking form", async () => {
      await renderAdjustmentForm(<AdjustmentForm />);

      const targetSelect = screen.getByLabelText("Target Account Selection");
      fireEvent.change(targetSelect, { target: { value: closedUuid } });

      await waitFor(() => {
        expect(screen.getByTestId("target-closed-warning")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Warning: Target account is CLOSED\. Review the account status carefully/i)
      ).toBeInTheDocument();
    });

    it("supports direct UUID typing into raw input fallback", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockSourceAccount);

      renderWithClient(<AdjustmentForm />);

      const rawSourceInput = screen.getByPlaceholderText(/e\.g\. 11111111-1111-4111-8111-111111111111/i);
      fireEvent.change(rawSourceInput, { target: { value: sourceUuid } });

      await waitFor(() => {
        expect(screen.getByTestId("source-account-card")).toBeInTheDocument();
      });

      expect(screen.getByText("ACCT-SOURCE-USD")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 3. Validation Logic
  // ==========================================================================
  describe("Client-Side Form Validation", () => {
    it("validates empty submission and renders accessible error messages", async () => {
      renderWithClient(<AdjustmentForm />);

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      await waitFor(() => {
        expect(screen.getByText("Source account is required")).toBeInTheDocument();
        expect(screen.getByText("Target account is required")).toBeInTheDocument();
        expect(screen.getByText("Amount is required")).toBeInTheDocument();
        expect(screen.getByText("Audit reason is required and cannot be blank")).toBeInTheDocument();
      });
    });

    it("rejects invalid non-UUID account IDs", async () => {
      renderWithClient(<AdjustmentForm />);

      const rawSourceInput = screen.getByPlaceholderText(/e\.g\. 11111111-1111-4111-8111-111111111111/i);
      fireEvent.change(rawSourceInput, { target: { value: "invalid-uuid-abc" } });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      await waitFor(() => {
        expect(screen.getByText("Source account ID must be a valid UUID")).toBeInTheDocument();
      });
    });

    it("blocks submission when source account and target account are identical", async () => {
      await renderAdjustmentForm(<AdjustmentForm />);

      const sourceSelect = screen.getByLabelText("Source Account Selection");
      fireEvent.change(sourceSelect, { target: { value: sourceUuid } });

      const targetSelect = screen.getByLabelText("Target Account Selection");
      fireEvent.change(targetSelect, { target: { value: sourceUuid } }); // Same UUID!

      fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: "100.00" } });
      fireEvent.change(screen.getByLabelText(/Audit Reason/i), { target: { value: "Valid reason" } });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Source account and target account must not be the same account")
        ).toBeInTheDocument();
      });
    });

    it("blocks submission when source and target account currencies mismatch", async () => {
      await renderAdjustmentForm(<AdjustmentForm />);

      const sourceSelect = screen.getByLabelText("Source Account Selection");
      fireEvent.change(sourceSelect, { target: { value: sourceUuid } }); // USD

      const targetSelect = screen.getByLabelText("Target Account Selection");
      fireEvent.change(targetSelect, { target: { value: eurUuid } }); // EUR

      fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: "100.00" } });
      fireEvent.change(screen.getByLabelText(/Audit Reason/i), { target: { value: "Valid reason" } });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Currency mismatch: Source account is in USD, but target account is in EUR/i)
        ).toBeInTheDocument();
      });
    });

    it("rejects invalid amount formats (letters, multiple decimals, negative amounts)", async () => {
      renderWithClient(<AdjustmentForm />);

      const amountInput = screen.getByLabelText(/Amount/i);

      // 1. Letters
      fireEvent.change(amountInput, { target: { value: "abc" } });
      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));
      await waitFor(() => {
        expect(screen.getByText("Invalid amount format. Use e.g. 10.50")).toBeInTheDocument();
      });

      // 2. Fractional beyond 2 decimal places
      fireEvent.change(amountInput, { target: { value: "10.999" } });
      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));
      await waitFor(() => {
        expect(screen.getByText("Invalid amount format. Use e.g. 10.50")).toBeInTheDocument();
      });

      // 3. Zero amount
      fireEvent.change(amountInput, { target: { value: "0.00" } });
      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));
      await waitFor(() => {
        expect(
          screen.getByText("Amount must be strictly positive (at least 0.01)")
        ).toBeInTheDocument();
      });
    });

    it("rejects whitespace-only reason or reason exceeding 500 characters", async () => {
      renderWithClient(<AdjustmentForm />);

      const reasonInput = screen.getByLabelText(/Audit Reason/i);

      // 1. Whitespace only
      fireEvent.change(reasonInput, { target: { value: "     " } });
      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));
      await waitFor(() => {
        expect(
          screen.getByText("Audit reason is required and cannot be blank")
        ).toBeInTheDocument();
      });

      // 2. Exceeding 500 characters
      const longReason = "A".repeat(501);
      fireEvent.change(reasonInput, { target: { value: longReason } });
      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));
      await waitFor(() => {
        expect(screen.getByText("Audit reason cannot exceed 500 characters")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // 4. Financial Integrity & Payload Freeze
  // ==========================================================================
  describe("Financial Integrity & Payload Freeze", () => {
    it("converts decimal amount to integer minor units with zero floating-point math", async () => {
      const onReviewSpy = vi.fn();

      await renderAdjustmentForm(<AdjustmentForm onReview={onReviewSpy} />);

      // Populate valid form
      fireEvent.change(screen.getByLabelText("Source Account Selection"), {
        target: { value: sourceUuid },
      });
      fireEvent.change(screen.getByLabelText("Target Account Selection"), {
        target: { value: targetUuid },
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: "150.75" },
      });
      fireEvent.change(screen.getByLabelText(/Audit Reason/i), {
        target: { value: "Operational ledger correction #REF-9988" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      await waitFor(() => {
        expect(screen.getByTestId("prepared-payload-card")).toBeInTheDocument();
      });

      // Verify exact payload emitted to onReview
      expect(onReviewSpy).toHaveBeenCalledTimes(1);
      expect(onReviewSpy).toHaveBeenCalledWith({
        sourceAccountId: sourceUuid,
        targetAccountId: targetUuid,
        amountMinor: 15075, // Exact integer minor units!
        currency: "USD",
        reason: "Operational ledger correction #REF-9988",
      });

      // Assert NO extra speculative fields in payload
      const firstCall = onReviewSpy.mock.calls[0];
      expect(firstCall).toBeDefined();
      const emittedPayload = firstCall![0];
      expect(Object.keys(emittedPayload).sort()).toEqual([
        "amountMinor",
        "currency",
        "reason",
        "sourceAccountId",
        "targetAccountId",
      ]);
      expect(typeof emittedPayload.amountMinor).toBe("number");
      expect(Number.isInteger(emittedPayload.amountMinor)).toBe(true);
    });

    it("preserves exact large integer minor unit values without precision loss", async () => {
      const onReviewSpy = vi.fn();

      await renderAdjustmentForm(<AdjustmentForm onReview={onReviewSpy} />);

      fireEvent.change(screen.getByLabelText("Source Account Selection"), {
        target: { value: sourceUuid },
      });
      fireEvent.change(screen.getByLabelText("Target Account Selection"), {
        target: { value: targetUuid },
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: "999999.99" },
      });
      fireEvent.change(screen.getByLabelText(/Audit Reason/i), {
        target: { value: "Treasury multi-account adjustment" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      await waitFor(() => {
        expect(onReviewSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            amountMinor: 99999999,
          })
        );
      });
    });
  });

  // ==========================================================================
  // 5. Mutation Safety & Idempotency Boundaries
  // ==========================================================================
  describe("Mutation Safety & Boundaries", () => {
    it("does NOT call createAdminFinancialAdjustment API upon Continue to Review", async () => {
      const createApiSpy = vi.spyOn(adminApi, "createAdminFinancialAdjustment");

      await renderAdjustmentForm(<AdjustmentForm />);

      fireEvent.change(screen.getByLabelText("Source Account Selection"), {
        target: { value: sourceUuid },
      });
      fireEvent.change(screen.getByLabelText("Target Account Selection"), {
        target: { value: targetUuid },
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: "50.00" },
      });
      fireEvent.change(screen.getByLabelText(/Audit Reason/i), {
        target: { value: "Preparation only" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      await waitFor(() => {
        expect(screen.getByTestId("prepared-payload-card")).toBeInTheDocument();
      });

      // CRITICAL: Must NEVER submit financial mutation in F7-H-B
      expect(createApiSpy).not.toHaveBeenCalled();
    });

    it("does NOT call crypto.randomUUID() for idempotency key generation", async () => {
      const randomUuidSpy = vi.spyOn(crypto, "randomUUID");

      await renderAdjustmentForm(<AdjustmentForm />);

      fireEvent.change(screen.getByLabelText("Source Account Selection"), {
        target: { value: sourceUuid },
      });
      fireEvent.change(screen.getByLabelText("Target Account Selection"), {
        target: { value: targetUuid },
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: "50.00" },
      });
      fireEvent.change(screen.getByLabelText(/Audit Reason/i), {
        target: { value: "Preparation only" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      await waitFor(() => {
        expect(screen.getByTestId("prepared-payload-card")).toBeInTheDocument();
      });

      // CRITICAL: Idempotency generation is strictly deferred to Phase F7-H-C confirmation stage
      expect(randomUuidSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 6. Reset & Cancellation Behavior
  // ==========================================================================
  describe("Reset & Cancel Behavior", () => {
    it("clears all fields, errors, and prepared payload when clicking Reset", async () => {
      const onCancelSpy = vi.fn();

      await renderAdjustmentForm(<AdjustmentForm onCancel={onCancelSpy} />);

      fireEvent.change(screen.getByLabelText("Source Account Selection"), {
        target: { value: sourceUuid },
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: "100.00" },
      });
      fireEvent.change(screen.getByLabelText(/Audit Reason/i), {
        target: { value: "Test reason" },
      });

      // Click Reset
      fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

      expect(screen.getByLabelText("Source Account Selection")).toHaveValue("");
      expect(screen.getByLabelText(/Amount/i)).toHaveValue("");
      expect(screen.getByLabelText(/Audit Reason/i)).toHaveValue("");
      expect(screen.queryByTestId("prepared-payload-card")).toBeNull();
      expect(onCancelSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 7. Security Invariants
  // ==========================================================================
  describe("Security & Sensitive Data Invariants", () => {
    it("never logs financial adjustment payload or account IDs to console", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await renderAdjustmentForm(<AdjustmentForm />);

      fireEvent.change(screen.getByLabelText("Source Account Selection"), {
        target: { value: sourceUuid },
      });
      fireEvent.change(screen.getByLabelText("Target Account Selection"), {
        target: { value: targetUuid },
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: "500.00" },
      });
      fireEvent.change(screen.getByLabelText(/Audit Reason/i), {
        target: { value: "Secret audit investigation" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Review/i }));

      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining("Secret audit investigation"));
      expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Secret audit investigation"));
    });

    it("never persists financial adjustment draft to localStorage", async () => {
      await renderAdjustmentForm(<AdjustmentForm />);

      fireEvent.change(screen.getByLabelText("Source Account Selection"), {
        target: { value: sourceUuid },
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: "500.00" },
      });

      expect(window.localStorage.length).toBe(0);
      expect(window.localStorage.getItem("adjustment")).toBeNull();
    });
  });
});
