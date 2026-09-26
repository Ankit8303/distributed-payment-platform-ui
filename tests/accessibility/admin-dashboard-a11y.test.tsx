import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminDashboardPage from "@/app/(admin)/admin/dashboard/page";
import { KpiCard } from "@/features/admin/components/kpi-card";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import * as authContext from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { Users, AlertTriangle } from "lucide-react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/dashboard",
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
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

describe("Phase F7-C Admin Dashboard Accessibility Audit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "admin-1", email: "admin@platform.local", role: "ADMIN" },
      status: "authenticated",
      accessToken: "mock-token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  it("provides single h1 heading and logical h2 section headings", async () => {
    vi.spyOn(adminApi, "getAdminDashboardSummary").mockResolvedValueOnce({
      totalUsers: 10,
      totalAccounts: 20,
      activeAccounts: 18,
      frozenAccounts: 2,
      totalPayments: 100,
      settledPayments: 95,
      failedPayments: 3,
      pendingReconciliationPayments: 2,
      openReconciliationCases: 1,
      totalNotifications: 50,
    });

    renderWithProviders(<AdminDashboardPage />);

    // Single H1
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Dashboard");

    // Semantic H2 section headings
    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s).toHaveLength(3);
    expect(h2s[0]).toHaveTextContent("User & Account Overview");
    expect(h2s[1]).toHaveTextContent("Payment Overview");
    expect(h2s[2]).toHaveTextContent("Operations & System Overview");
  });

  it("provides semantic region landmarks for KPI cards with accessible names", () => {
    render(
      <KpiCard
        title="Active Accounts"
        value={150}
        icon={Users}
        statusBadge={{ label: "Healthy", variant: "success" }}
      />
    );

    const region = screen.getByRole("region", { name: "Active Accounts" });
    expect(region).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("announces loading state via role='status' with accessible label", () => {
    render(<KpiCard title="Frozen Accounts" value={undefined} isLoading={true} />);

    const statusEl = screen.getByRole("status");
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute("aria-label", "Loading Frozen Accounts");
  });

  it("renders role='alert' with assertive aria-live for AdminErrorState", () => {
    const error = new ApiError({
      type: "https://api.paymentledger.com/errors/UNAVAILABLE",
      title: "Service Unavailable",
      status: 503,
      detail: "Ledger replica synchronizing",
      errorCode: "UNAVAILABLE",
      correlationId: "corr-a11y-1234",
      timestamp: "2026-09-26T12:00:00Z",
    });

    render(<AdminErrorState error={error} onRetry={() => {}} />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("ensures critical metric statuses are conveyed with text labels and not color alone", () => {
    render(
      <KpiCard
        title="Failed Payments"
        value={12}
        variant="danger"
        icon={AlertTriangle}
        statusBadge={{ label: "Terminal Failures", variant: "danger" }}
      />
    );

    // Text badge provides non-color semantic meaning
    expect(screen.getByText("Terminal Failures")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-card-failed-payments-value")).toHaveTextContent("12");
  });
});
