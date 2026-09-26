import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAccountInspectorPage from "@/app/(admin)/admin/accounts/[id]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import type { AccountAdminResponse } from "@/types/admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/accounts/acc-a11y-1111",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "acc-a11y-1111" }),
}));

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

const mockAccount: AccountAdminResponse = {
  id: "acc-a11y-1111",
  accountNumber: "ACC-US-A11Y-01",
  ownerId: "usr-owner-a11y",
  accountType: "CUSTOMER",
  currency: "USD",
  status: "ACTIVE",
  materializedBalanceMinor: 100000,
  version: 1,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-15T12:00:00Z",
};

describe("Phase F7-G-F Admin Ledger & Audit Navigation Accessibility (WCAG 2.1 AA)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-valid-jwt-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);
    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue({
      accountId: mockAccount.id,
      accountNumber: mockAccount.accountNumber,
      currency: "USD",
      materializedBalanceMinor: 100000,
      authoritativeLedgerBalanceMinor: 100000,
      differenceMinor: 0,
      isConsistent: true,
    });
  });

  it("provides semantic section landmark with aria-labelledby pointing to heading", async () => {
    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
    });

    const section = screen.getByTestId("section-ledger-audit");
    expect(section).toHaveAttribute("aria-labelledby", "ledger-audit-heading");
    const heading = screen.getByText("Ledger & Audit");
    expect(heading).toHaveAttribute("id", "ledger-audit-heading");
    expect(heading.tagName).toBe("H2");
  });

  it("provides meaningful hierarchical subheadings for Ledger and Audit sub-cards", async () => {
    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
    });

    const ledgerHeading = screen.getByRole("heading", { level: 3, name: "Account Ledger" });
    const auditHeading = screen.getByRole("heading", { level: 3, name: "Account Audit Trail" });

    expect(ledgerHeading).toBeInTheDocument();
    expect(auditHeading).toBeInTheDocument();
  });

  it("provides descriptive accessible names on all navigation links", async () => {
    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
    });

    const ledgerLink = screen.getByRole("link", { name: "View Account Ledger" });
    const auditLink = screen.getByRole("link", { name: "View Account Audit History" });

    expect(ledgerLink).toBeInTheDocument();
    expect(auditLink).toBeInTheDocument();
  });

  it("ensures links include visible focus indicator styles and keyboard accessibility", async () => {
    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("section-ledger-audit")).toBeInTheDocument();
    });

    const ledgerLink = screen.getByTestId("view-account-ledger-link");
    const auditLink = screen.getByTestId("view-account-audit-link");

    expect(ledgerLink.className).toContain("focus-visible:ring-2");
    expect(auditLink.className).toContain("focus-visible:ring-2");
  });
});
