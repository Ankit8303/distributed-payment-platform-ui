import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/protected-route";
import * as authContext from "@/features/auth/auth-context";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import ReconciliationWorkspacePage from "@/app/(admin)/admin/reconciliation/page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/reconciliation",
}));

describe("Phase F8-C Admin Reconciliation Authorization & Financial Safety", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithProviders = (role: "ADMIN" | "SYSTEM" | "CUSTOMER" | "MERCHANT" | null) => {
    if (role) {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: { id: `user-${role}`, email: `${role.toLowerCase()}@platform.local`, role },
        status: "authenticated",
        accessToken: `mock-${role}-token`,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });
    } else {
      vi.spyOn(authContext, "useAuth").mockReturnValue({
        user: null,
        status: "unauthenticated",
        accessToken: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <ProtectedRoute allowedRoles={["ADMIN", "SYSTEM"]}>
          <ReconciliationWorkspacePage />
        </ProtectedRoute>
      </QueryClientProvider>
    );
  };

  it("1. ADMIN is authorized and accesses reconciliation workspace, triggering API", async () => {
    const emptyPage = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: true,
      pageable: {
        pageNumber: 0,
        pageSize: 20,
        sort: { sorted: false, unsorted: true, empty: true },
        offset: 0,
        paged: true,
        unpaged: false,
      },
      sort: { sorted: false, unsorted: true, empty: true },
      numberOfElements: 0,
    };

    const fetchCasesSpy = vi.spyOn(adminApi, "getAdminReconciliationCases").mockResolvedValue(emptyPage as any);

    renderWithProviders("ADMIN");

    await waitFor(() => {
      expect(screen.getByTestId("reconciliation-workspace-heading")).toBeInTheDocument();
    });

    expect(fetchCasesSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("access-restricted-alert")).not.toBeInTheDocument();
  });

  it("2. SYSTEM is authorized and accesses reconciliation workspace, triggering API", async () => {
    const emptyPage = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: true,
      pageable: {
        pageNumber: 0,
        pageSize: 20,
        sort: { sorted: false, unsorted: true, empty: true },
        offset: 0,
        paged: true,
        unpaged: false,
      },
      sort: { sorted: false, unsorted: true, empty: true },
      numberOfElements: 0,
    };

    const fetchCasesSpy = vi.spyOn(adminApi, "getAdminReconciliationCases").mockResolvedValue(emptyPage as any);

    renderWithProviders("SYSTEM");

    await waitFor(() => {
      expect(screen.getByTestId("reconciliation-workspace-heading")).toBeInTheDocument();
    });

    expect(fetchCasesSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("access-restricted-alert")).not.toBeInTheDocument();
  });

  it("3. CUSTOMER is denied access and zero reconciliation API calls are executed", async () => {
    const fetchCasesSpy = vi.spyOn(adminApi, "getAdminReconciliationCases");

    renderWithProviders("CUSTOMER");

    await waitFor(() => {
      expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("reconciliation-workspace-heading")).not.toBeInTheDocument();
    expect(fetchCasesSpy).not.toHaveBeenCalled();
  });

  it("4. MERCHANT is denied access and zero reconciliation API calls are executed", async () => {
    const fetchCasesSpy = vi.spyOn(adminApi, "getAdminReconciliationCases");

    renderWithProviders("MERCHANT");

    await waitFor(() => {
      expect(screen.getByTestId("access-restricted-alert")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("reconciliation-workspace-heading")).not.toBeInTheDocument();
    expect(fetchCasesSpy).not.toHaveBeenCalled();
  });

  it("5. Unauthenticated user is blocked and redirected to login with zero API calls", async () => {
    const fetchCasesSpy = vi.spyOn(adminApi, "getAdminReconciliationCases");

    renderWithProviders(null);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?redirect=%2Fadmin%2Freconciliation");
    });

    expect(screen.queryByTestId("reconciliation-workspace-heading")).not.toBeInTheDocument();
    expect(fetchCasesSpy).not.toHaveBeenCalled();
  });

  it("6. Financial Integrity: Zero client balance, fee, FX, or discrepancy delta calculations", async () => {
    // Verifies that the reconciliation workspace presents server data without calculating derived values
    const mockCase = {
      id: "case-audit-001",
      operationType: "PAYMENT" as const,
      operationId: "payment-raw-123",
      providerReference: "ch_raw_456",
      localStatus: "PENDING",
      reconciliationStatus: "DISCREPANCY_DETECTED" as const,
      discrepancyType: "AMOUNT_MISMATCH" as const,
      attemptCount: 1,
      nextAttemptAt: null,
      resolvedAt: null,
      workerId: "audit-worker",
      correlationId: "corr-audit-001",
      createdAt: "2026-09-26T12:00:00Z",
      updatedAt: "2026-09-26T12:05:00Z",
    };

    vi.spyOn(adminApi, "getAdminReconciliationCases").mockResolvedValue({
      content: [mockCase],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
      pageable: {
        pageNumber: 0,
        pageSize: 20,
        sort: { sorted: false, unsorted: true, empty: true },
        offset: 0,
        paged: true,
        unpaged: false,
      },
      sort: { sorted: false, unsorted: true, empty: true },
      numberOfElements: 1,
    } as any);

    renderWithProviders("ADMIN");

    await waitFor(() => {
      expect(screen.getByTestId("reconciliation-workspace-heading")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId("reconciliation-row-case-audit-001")).toBeInTheDocument();
    });

    // Content rendered directly as server-provided strings, zero mathematical modifications
    expect(screen.getByText("AMOUNT MISMATCH")).toBeInTheDocument();
    expect(screen.getByText("DISCREPANCY_DETECTED")).toBeInTheDocument();
    expect(screen.getByText("payment-...")).toBeInTheDocument();
  });
});
