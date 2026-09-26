import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAccountInspectorPage from "@/app/(admin)/admin/accounts/[id]/page";
import { AccountLifecycleModal } from "@/features/admin/components/account-lifecycle-modal";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { AccountAdminResponse } from "@/types/admin";
import AdminLayout from "@/app/(admin)/layout";

// Mock next/navigation
const mockPush = vi.fn();
let mockParams = { id: "acc-11111111-2222-3333-4444-555555555555" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => `/admin/accounts/${mockParams.id}`,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => mockParams,
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

const mockActiveAccount: AccountAdminResponse = {
  id: "acc-11111111-2222-3333-4444-555555555555",
  accountNumber: "ACC-US-0042",
  ownerId: "usr-owner-9999-8888",
  accountType: "CUSTOMER",
  currency: "USD",
  status: "ACTIVE",
  materializedBalanceMinor: 345075,
  version: 3,
  createdAt: "2026-09-01T12:00:00Z",
  updatedAt: "2026-09-15T15:30:00Z",
};

const mockFrozenAccount: AccountAdminResponse = {
  ...mockActiveAccount,
  status: "FROZEN",
};

const mockClosedAccount: AccountAdminResponse = {
  ...mockActiveAccount,
  status: "CLOSED",
};

describe("Admin Account Lifecycle UI (Phase F7-G-E)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: "acc-11111111-2222-3333-4444-555555555555" };

    // Default authenticated ADMIN user
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-admin-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    // Mock balance summary response
    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue({
      accountId: mockActiveAccount.id,
      accountNumber: mockActiveAccount.accountNumber,
      currency: mockActiveAccount.currency,
      materializedBalanceMinor: mockActiveAccount.materializedBalanceMinor,
      authoritativeLedgerBalanceMinor: mockActiveAccount.materializedBalanceMinor,
      differenceMinor: 0,
      isConsistent: true,
    });
  });

  // ==========================================================================
  // 1. State Visibility Rules
  // ==========================================================================
  describe("State Visibility Rules", () => {
    it("ACTIVE account shows Freeze Account button and hides Unfreeze", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockActiveAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      expect(screen.getByTestId("freeze-account-button")).toBeInTheDocument();
      expect(screen.queryByTestId("unfreeze-account-button")).not.toBeInTheDocument();
    });

    it("FROZEN account shows Unfreeze Account button and hides Freeze", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockFrozenAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      expect(screen.getByTestId("unfreeze-account-button")).toBeInTheDocument();
      expect(screen.queryByTestId("freeze-account-button")).not.toBeInTheDocument();
    });

    it("CLOSED account exposes neither Freeze nor Unfreeze button", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockClosedAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("freeze-account-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unfreeze-account-button")).not.toBeInTheDocument();
      expect(screen.getByTestId("closed-account-notice")).toHaveTextContent(
        "Account is permanently closed. Lifecycle mutations are disabled."
      );
    });
  });

  // ==========================================================================
  // 2. Freeze Workflow & Mandatory Reason Validation
  // ==========================================================================
  describe("Freeze Workflow & Reason Validation", () => {
    it("opens Freeze modal, does NOT submit on open, and requires a non-blank reason", async () => {
      const freezeSpy = vi.spyOn(adminApi, "freezeAdminAccount");
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockActiveAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("freeze-account-button")).toBeInTheDocument();
      });

      // 1. Open modal
      fireEvent.click(screen.getByTestId("freeze-account-button"));

      expect(screen.getByTestId("account-lifecycle-modal")).toBeInTheDocument();
      expect(screen.getByTestId("lifecycle-modal-title")).toHaveTextContent("Freeze Account");
      expect(screen.getByTestId("modal-account-number")).toHaveTextContent("ACC-US-0042");

      // Verify no mutation occurred merely from opening the modal
      expect(freezeSpy).not.toHaveBeenCalled();

      // 2. Attempt confirm with empty reason -> validation error
      const confirmBtn = screen.getByTestId("confirm-lifecycle-button");
      fireEvent.click(confirmBtn);

      expect(screen.getByTestId("lifecycle-reason-error")).toHaveTextContent(
        "A non-blank operational justification is required."
      );
      expect(freezeSpy).not.toHaveBeenCalled();

      // 3. Attempt confirm with whitespace-only reason -> validation error
      const reasonInput = screen.getByTestId("lifecycle-reason-input");
      fireEvent.change(reasonInput, { target: { value: "    " } });
      fireEvent.click(confirmBtn);

      expect(screen.getByTestId("lifecycle-reason-error")).toBeInTheDocument();
      expect(freezeSpy).not.toHaveBeenCalled();

      // 4. Enter valid reason and submit
      fireEvent.change(reasonInput, { target: { value: "Suspicious velocity threshold exceeded." } });
      freezeSpy.mockResolvedValue(mockFrozenAccount);

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(freezeSpy).toHaveBeenCalledTimes(1);
      });

      expect(freezeSpy).toHaveBeenCalledWith(
        mockActiveAccount.id,
        { reason: "Suspicious velocity threshold exceeded." }
      );
    });

    it("displays success banner after successful freeze mutation", async () => {
      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockActiveAccount);
      vi.spyOn(adminApi, "freezeAdminAccount").mockResolvedValue(mockFrozenAccount);

      renderWithProviders(<AdminAccountInspectorPage />);

      await waitFor(() => {
        expect(screen.getByTestId("freeze-account-button")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("freeze-account-button"));

      const reasonInput = screen.getByTestId("lifecycle-reason-input");
      fireEvent.change(reasonInput, { target: { value: "Regulatory freeze order #1234." } });

      fireEvent.click(screen.getByTestId("confirm-lifecycle-button"));

      await waitFor(() => {
        expect(screen.getByTestId("lifecycle-success-banner")).toBeInTheDocument();
      });

      expect(screen.getByTestId("lifecycle-success-banner")).toHaveTextContent(
        "Account ACC-US-0042 was successfully frozen."
      );
    });

    it("prevents duplicate submission while freeze mutation is pending", async () => {
      let resolveFreeze: (val: AccountAdminResponse) => void;
      const pendingPromise = new Promise<AccountAdminResponse>((resolve) => {
        resolveFreeze = resolve;
      });
      const freezeSpy = vi.spyOn(adminApi, "freezeAdminAccount").mockReturnValue(pendingPromise);

      renderWithProviders(
        <AccountLifecycleModal
          isOpen={true}
          action="FREEZE"
          accountId={mockActiveAccount.id}
          accountNumber={mockActiveAccount.accountNumber}
          currentStatus={mockActiveAccount.status}
          onClose={vi.fn()}
        />
      );

      const reasonInput = screen.getByTestId("lifecycle-reason-input");
      fireEvent.change(reasonInput, { target: { value: "AML Compliance Review" } });

      const confirmBtn = screen.getByTestId("confirm-lifecycle-button");
      const cancelBtn = screen.getByTestId("cancel-lifecycle-button");

      fireEvent.click(confirmBtn);

      // Verify pending state: buttons disabled
      await waitFor(() => {
        expect(confirmBtn).toBeDisabled();
      });
      expect(cancelBtn).toBeDisabled();
      expect(screen.getByText("Freezing Account...")).toBeInTheDocument();

      // Double-click attempt must NOT invoke duplicate API call
      fireEvent.click(confirmBtn);
      expect(freezeSpy).toHaveBeenCalledTimes(1);

      // Resolve
      resolveFreeze!(mockFrozenAccount);
    });
  });

  // ==========================================================================
  // 3. Unfreeze Workflow
  // ==========================================================================
  describe("Unfreeze Workflow", () => {
    it("opens Unfreeze modal, submits unfreeze mutation, and closes on success", async () => {
      const unfreezeSpy = vi
        .spyOn(adminApi, "unfreezeAdminAccount")
        .mockResolvedValue(mockActiveAccount);
      const closeMock = vi.fn();
      const successMock = vi.fn();

      renderWithProviders(
        <AccountLifecycleModal
          isOpen={true}
          action="UNFREEZE"
          accountId={mockFrozenAccount.id}
          accountNumber={mockFrozenAccount.accountNumber}
          currentStatus={mockFrozenAccount.status}
          onClose={closeMock}
          onSuccess={successMock}
        />
      );

      expect(screen.getByTestId("lifecycle-modal-title")).toHaveTextContent("Unfreeze Account");

      const reasonInput = screen.getByTestId("lifecycle-reason-input");
      fireEvent.change(reasonInput, { target: { value: "Operator completed identity re-verification." } });

      fireEvent.click(screen.getByTestId("confirm-lifecycle-button"));

      await waitFor(() => {
        expect(unfreezeSpy).toHaveBeenCalledWith(
          mockFrozenAccount.id,
          { reason: "Operator completed identity re-verification." }
        );
      });

      expect(successMock).toHaveBeenCalledWith(mockActiveAccount);
      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 4. Concurrency & HTTP Error Handling
  // ==========================================================================
  describe("Error Handling & Stale State", () => {
    it("displays conflict error (409) when account state was already changed on server", async () => {
      const conflictError = new ApiError({
        type: "about:blank",
        title: "Account State Conflict",
        status: 409,
        detail: "Account is already FROZEN in the primary ledger.",
        errorCode: "ACCOUNT_CONFLICT",
        correlationId: "corr-conf-409",
        timestamp: "2026-09-26T12:00:00Z",
      });

      vi.spyOn(adminApi, "freezeAdminAccount").mockRejectedValue(conflictError);

      renderWithProviders(
        <AccountLifecycleModal
          isOpen={true}
          action="FREEZE"
          accountId={mockActiveAccount.id}
          accountNumber={mockActiveAccount.accountNumber}
          currentStatus={mockActiveAccount.status}
          onClose={vi.fn()}
        />
      );

      const reasonInput = screen.getByTestId("lifecycle-reason-input");
      fireEvent.change(reasonInput, { target: { value: "Freeze attempt" } });
      fireEvent.click(screen.getByTestId("confirm-lifecycle-button"));

      await waitFor(() => {
        expect(screen.getByTestId("lifecycle-submission-error")).toBeInTheDocument();
      });

      expect(screen.getByText("Account is already FROZEN in the primary ledger.")).toBeInTheDocument();
      expect(screen.getByText(/corr-conf-409/)).toBeInTheDocument();
    });

    it("handles 400 Bad Request without closing modal or executing optimistic changes", async () => {
      const badReqError = new ApiError({
        type: "about:blank",
        title: "Invalid Request",
        status: 400,
        detail: "Invalid lifecycle transition payload.",
        errorCode: "INVALID_REQUEST",
        timestamp: "2026-09-26T12:00:00Z",
      });

      vi.spyOn(adminApi, "freezeAdminAccount").mockRejectedValue(badReqError);

      renderWithProviders(
        <AccountLifecycleModal
          isOpen={true}
          action="FREEZE"
          accountId={mockActiveAccount.id}
          accountNumber={mockActiveAccount.accountNumber}
          currentStatus={mockActiveAccount.status}
          onClose={vi.fn()}
        />
      );

      fireEvent.change(screen.getByTestId("lifecycle-reason-input"), {
        target: { value: "Test reason" },
      });
      fireEvent.click(screen.getByTestId("confirm-lifecycle-button"));

      await waitFor(() => {
        expect(screen.getByTestId("lifecycle-submission-error")).toBeInTheDocument();
      });

      expect(screen.getByText("Invalid lifecycle transition payload.")).toBeInTheDocument();
    });

    it("cancels modal cleanly when Cancel button is clicked", () => {
      const closeMock = vi.fn();
      renderWithProviders(
        <AccountLifecycleModal
          isOpen={true}
          action="FREEZE"
          accountId={mockActiveAccount.id}
          accountNumber={mockActiveAccount.accountNumber}
          currentStatus={mockActiveAccount.status}
          onClose={closeMock}
        />
      );

      fireEvent.click(screen.getByTestId("cancel-lifecycle-button"));
      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 5. Security Boundary
  // ==========================================================================
  describe("Security Boundary", () => {
    it("allows SYSTEM role to view and access Freeze button", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "sys-1", email: "system@platform.local", role: "SYSTEM" },
        status: "authenticated",
        accessToken: "mock-sys-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockActiveAccount);

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("freeze-account-button")).toBeInTheDocument();
      });
    });

    it("blocks CUSTOMER role from viewing lifecycle controls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "cust-1", email: "customer@platform.local", role: "CUSTOMER" },
        status: "authenticated",
        accessToken: "mock-cust-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("freeze-account-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unfreeze-account-button")).not.toBeInTheDocument();
    });

    it("blocks MERCHANT role from viewing lifecycle controls", async () => {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: "merch-1", email: "merchant@platform.local", role: "MERCHANT" },
        status: "authenticated",
        accessToken: "mock-merch-token",
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      renderWithProviders(
        <AdminLayout>
          <AdminAccountInspectorPage />
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("freeze-account-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unfreeze-account-button")).not.toBeInTheDocument();
    });
  });
});
