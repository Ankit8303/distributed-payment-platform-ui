import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAccountInspectorPage from "@/app/(admin)/admin/accounts/[id]/page";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import type { AccountAdminResponse } from "@/types/admin";
import { ApiError } from "@/lib/api/client";

// Mock next/navigation
let mockParams = { id: "acc-a11y-001" };
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => `/admin/accounts/${mockParams.id}`,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => mockParams,
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
  id: "acc-a11y-001",
  accountNumber: "ACC-A11Y-USD",
  ownerId: "usr-a11y-owner-999",
  accountType: "CUSTOMER",
  currency: "USD",
  status: "ACTIVE",
  materializedBalanceMinor: 500000,
  version: 1,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-02T11:00:00Z",
};

describe("Admin Account Inspector Accessibility (Phase F7-G-C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: "acc-a11y-001" };

    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-admin-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue({
      accountId: "acc-a11y-001",
      accountNumber: "ACC-A11Y-USD",
      currency: "USD",
      materializedBalanceMinor: 500000,
      authoritativeLedgerBalanceMinor: 500000,
      differenceMinor: 0,
      isConsistent: true,
    });
  });

  it("maintains a single H1 and a valid logical heading hierarchy", async () => {
    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
    });

    const h1Headings = screen.getAllByRole("heading", { level: 1 });
    expect(h1Headings).toHaveLength(1);
    expect(h1Headings[0]).toHaveTextContent("Account Inspector");

    const h2Headings = screen.getAllByRole("heading", { level: 2 });
    expect(h2Headings.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("heading", { level: 2, name: "Account Identity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Financial Balance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Lifecycle & Governance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Audit & Record Metadata" })).toBeInTheDocument();
  });

  it("provides accessible breadcrumb navigation landmark", async () => {
    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
    });

    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByText("ACC-A11Y-USD")).toHaveAttribute("aria-current", "page");
  });

  it("associates semantic sections with their respective headings", async () => {
    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
    });

    const identitySection = screen.getByTestId("section-account-identity");
    expect(identitySection).toHaveAttribute("aria-labelledby", "identity-heading");

    const financialSection = screen.getByTestId("section-financial-balance");
    expect(financialSection).toHaveAttribute("aria-labelledby", "financial-heading");
  });

  it("provides accessible labels on all interactive copy and action buttons", async () => {
    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Copy account number" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy account ID" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy owner ID" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh account record" })).toBeInTheDocument();
  });

  it("announces status with text alternative in status badge", async () => {
    vi.spyOn(adminApi, "getAdminAccount").mockResolvedValue(mockAccount);

    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-account-inspector-container")).toBeInTheDocument();
    });

    const badges = screen.getAllByTestId("account-status-badge");
    expect(badges[0]).toHaveAttribute("aria-label", "Account Status: Active");
  });

  it("provides accessible loading state with screen reader text", () => {
    vi.spyOn(adminApi, "getAdminAccount").mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<AdminAccountInspectorPage />);

    expect(screen.getByTestId("admin-account-inspector-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading account details...")).toBeInTheDocument();
  });

  it("provides accessible alert in error state", async () => {
    const apiError = new ApiError({
      type: "about:blank",
      title: "Query Failed",
      status: 500,
      detail: "Ledger replica down",
      errorCode: "SERVER_ERROR",
      timestamp: "2026-09-26T12:00:00Z",
    });

    vi.spyOn(adminApi, "getAdminAccount").mockRejectedValue(apiError);

    renderWithProviders(<AdminAccountInspectorPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });
});
