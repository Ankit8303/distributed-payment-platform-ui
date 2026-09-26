import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AccountBalanceConsistency } from "@/features/admin/components/account-balance-consistency";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import type { AccountBalanceSummaryResponse } from "@/types/admin";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientProvider>
  );
}

const mockConsistent: AccountBalanceSummaryResponse = {
  accountId: "acc-a11y-001",
  accountNumber: "ACC-A11Y-01",
  currency: "USD",
  materializedBalanceMinor: 250000,
  authoritativeLedgerBalanceMinor: 250000,
  differenceMinor: 0,
  isConsistent: true,
};

const mockDiscrepant: AccountBalanceSummaryResponse = {
  accountId: "acc-a11y-001",
  accountNumber: "ACC-A11Y-01",
  currency: "USD",
  materializedBalanceMinor: 250000,
  authoritativeLedgerBalanceMinor: 240000,
  differenceMinor: 10000,
  isConsistent: false,
};

describe("Admin Account Balance Consistency Accessibility (Phase F7-G-D)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-admin-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  it("maintains semantic section markup associated with heading", async () => {
    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(mockConsistent);

    renderWithProviders(<AccountBalanceConsistency accountId={mockConsistent.accountId} />);

    await waitFor(() => {
      expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
    });

    const section = screen.getByTestId("section-balance-consistency");
    expect(section).toHaveAttribute("aria-labelledby", "balance-consistency-heading");

    const heading = screen.getByRole("heading", { level: 2, name: "Balance Consistency" });
    expect(heading).toHaveAttribute("id", "balance-consistency-heading");
  });

  it("provides text alternative for consistent status badge (not color alone)", async () => {
    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(mockConsistent);

    renderWithProviders(<AccountBalanceConsistency accountId={mockConsistent.accountId} />);

    await waitFor(() => {
      expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
    });

    const badge = screen.getByTestId("consistency-status-badge");
    expect(badge).toHaveAttribute("aria-label", "Consistency Status: Verified Consistent");
    expect(badge).toHaveTextContent("Consistent");
  });

  it("provides role='alert' and assertive live region for discrepancy state", async () => {
    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(mockDiscrepant);

    renderWithProviders(<AccountBalanceConsistency accountId={mockDiscrepant.accountId} />);

    await waitFor(() => {
      expect(screen.getByTestId("section-balance-consistency")).toBeInTheDocument();
    });

    const badge = screen.getByTestId("consistency-status-badge");
    expect(badge).toHaveAttribute("aria-label", "Consistency Status: Discrepancy Detected");
    expect(badge).toHaveTextContent("Discrepancy Detected");

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent(/Balance Discrepancy Reported by Backend/i);
  });

  it("provides accessible loading state with screen-reader announcement", () => {
    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<AccountBalanceConsistency accountId="acc-loading" />);

    expect(screen.getByTestId("balance-consistency-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading balance consistency summary...")).toBeInTheDocument();
  });

  it("provides accessible error state with labeled retry button", async () => {
    const error = new ApiError({
      type: "about:blank",
      title: "Query Failed",
      status: 500,
      detail: "Audit engine unreachable",
      errorCode: "UNREACHABLE",
      timestamp: "2026-09-26T12:00:00Z",
    });

    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockRejectedValue(error);

    renderWithProviders(<AccountBalanceConsistency accountId="acc-err" />);

    await waitFor(() => {
      expect(screen.getByTestId("balance-consistency-error")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: "Retry loading balance consistency" });
    expect(retryBtn).toBeInTheDocument();
  });
});
