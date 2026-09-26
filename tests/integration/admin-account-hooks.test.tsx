import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as adminApi from "@/lib/api/endpoints/admin-api";
import { adminKeys } from "@/features/admin/hooks/query-keys";
import {
  useAdminAccounts,
  normalizeAccountQueryParams,
} from "@/features/admin/hooks/use-admin-accounts";
import { useAdminAccount } from "@/features/admin/hooks/use-admin-account";
import { useAdminAccountBalanceSummary } from "@/features/admin/hooks/use-admin-account-balance-summary";
import { useAdminAccountLifecycle } from "@/features/admin/hooks/use-admin-account-lifecycle";
import { ApiError } from "@/lib/api/client";
import type {
  AccountAdminResponse,
  AccountBalanceSummaryResponse,
  Page,
} from "@/types/admin";

describe("Phase F7-G-A Admin Account Governance Hooks", () => {
  let queryClient: QueryClient;

  const makeApiError = (
    status: number,
    title: string,
    detail: string,
    errorCode: string
  ): ApiError =>
    new ApiError({
      type: "about:blank",
      title,
      status,
      detail,
      errorCode,
      timestamp: new Date().toISOString(),
    });

  const mockAccount: AccountAdminResponse = {
    id: "acc-uuid-101",
    accountNumber: "ACCT-101-USD",
    ownerId: "usr-uuid-201",
    accountType: "CUSTOMER",
    currency: "USD",
    status: "ACTIVE",
    materializedBalanceMinor: 50000,
    version: 1,
    createdAt: "2026-09-01T12:00:00Z",
    updatedAt: "2026-09-01T12:00:00Z",
  };

  const mockFrozenAccount: AccountAdminResponse = {
    ...mockAccount,
    status: "FROZEN",
    version: 2,
    updatedAt: "2026-09-26T12:00:00Z",
  };

  const mockConsistentBalanceSummary: AccountBalanceSummaryResponse = {
    accountId: "acc-uuid-101",
    accountNumber: "ACCT-101-USD",
    currency: "USD",
    materializedBalanceMinor: 50000,
    authoritativeLedgerBalanceMinor: 50000,
    differenceMinor: 0,
    isConsistent: true,
  };

  const mockDiscrepantBalanceSummary: AccountBalanceSummaryResponse = {
    accountId: "acc-uuid-101",
    accountNumber: "ACCT-101-USD",
    currency: "USD",
    materializedBalanceMinor: 50000,
    authoritativeLedgerBalanceMinor: 48500,
    differenceMinor: 1500,
    isConsistent: false,
  };

  const mockAccountsPage: Page<AccountAdminResponse> = {
    content: [mockAccount],
    pageable: {
      pageNumber: 0,
      pageSize: 20,
      sort: { sorted: true, unsorted: false, empty: false },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: 1,
    totalPages: 1,
    last: true,
    first: true,
    size: 20,
    number: 0,
    sort: { sorted: true, unsorted: false, empty: false },
    numberOfElements: 1,
    empty: false,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Parameter Normalization & Priority Ladder
  // ==========================================================================
  describe("normalizeAccountQueryParams (Critical Priority Filter Ladder)", () => {
    it("returns undefined for undefined or empty parameters", () => {
      expect(normalizeAccountQueryParams(undefined)).toBeUndefined();
      expect(normalizeAccountQueryParams({})).toBeUndefined();
    });

    it("preserves pagination parameters without filters", () => {
      expect(normalizeAccountQueryParams({ page: 2, size: 50, sort: "createdAt,asc" })).toEqual({
        page: 2,
        size: 50,
        sort: "createdAt,asc",
      });
    });

    it("Priority 1: ownerId takes precedence over status and accountType", () => {
      const result = normalizeAccountQueryParams({
        ownerId: "usr-uuid-201",
        status: "ACTIVE",
        accountType: "CUSTOMER",
        page: 0,
        size: 20,
      });

      expect(result).toEqual({
        page: 0,
        size: 20,
        ownerId: "usr-uuid-201",
      });
      // status and accountType MUST be dropped to adhere to backend priority logic
      expect(result?.status).toBeUndefined();
      expect(result?.accountType).toBeUndefined();
    });

    it("Priority 2: status takes precedence over accountType when ownerId is missing", () => {
      const result = normalizeAccountQueryParams({
        status: "FROZEN",
        accountType: "MERCHANT",
        page: 1,
      });

      expect(result).toEqual({
        page: 1,
        status: "FROZEN",
      });
      expect(result?.accountType).toBeUndefined();
    });

    it("Priority 3: accountType is preserved when neither ownerId nor status is provided", () => {
      const result = normalizeAccountQueryParams({
        accountType: "INTERNAL_SETTLEMENT",
        size: 10,
      });

      expect(result).toEqual({
        size: 10,
        accountType: "INTERNAL_SETTLEMENT",
      });
    });

    it("trims whitespace from ownerId", () => {
      const result = normalizeAccountQueryParams({
        ownerId: "   usr-uuid-999   ",
      });
      expect(result).toEqual({ ownerId: "usr-uuid-999" });
    });
  });

  // ==========================================================================
  // 2. useAdminAccounts
  // ==========================================================================
  describe("useAdminAccounts", () => {
    it("fetches paginated accounts with default parameters", async () => {
      const getSpy = vi
        .spyOn(adminApi, "getAdminAccounts")
        .mockResolvedValue(mockAccountsPage);

      const { result } = renderHook(() => useAdminAccounts(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getSpy).toHaveBeenCalledWith(undefined, { signal: expect.any(AbortSignal) });
      expect(result.current.data?.content).toHaveLength(1);
      expect(result.current.data?.content[0]?.accountNumber).toBe("ACCT-101-USD");
    });

    it("normalizes and passes single priority filter to backend API", async () => {
      const getSpy = vi
        .spyOn(adminApi, "getAdminAccounts")
        .mockResolvedValue(mockAccountsPage);

      const { result } = renderHook(
        () =>
          useAdminAccounts({
            ownerId: "usr-uuid-201",
            status: "ACTIVE", // should be dropped by priority ladder
            page: 0,
            size: 20,
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getSpy).toHaveBeenCalledWith(
        { page: 0, size: 20, ownerId: "usr-uuid-201" },
        { signal: expect.any(AbortSignal) }
      );
    });

    it("handles backend API error gracefully", async () => {
      const apiError = makeApiError(
        500,
        "Internal Server Error",
        "Failed to fetch accounts",
        "INTERNAL_ERROR"
      );
      vi.spyOn(adminApi, "getAdminAccounts").mockRejectedValue(apiError);

      const { result } = renderHook(() => useAdminAccounts(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(apiError);
    });

    it("handles empty accounts page", async () => {
      const emptyPage: Page<AccountAdminResponse> = {
        ...mockAccountsPage,
        content: [],
        totalElements: 0,
        totalPages: 0,
        empty: true,
      };
      vi.spyOn(adminApi, "getAdminAccounts").mockResolvedValue(emptyPage);

      const { result } = renderHook(() => useAdminAccounts({ page: 0, size: 20 }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.content).toHaveLength(0);
      expect(result.current.data?.empty).toBe(true);
    });
  });

  // ==========================================================================
  // 3. useAdminAccount
  // ==========================================================================
  describe("useAdminAccount", () => {
    it("fetches single account detail for valid accountId", async () => {
      const getSpy = vi
        .spyOn(adminApi, "getAdminAccount")
        .mockResolvedValue(mockAccount);

      const { result } = renderHook(() => useAdminAccount("acc-uuid-101"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getSpy).toHaveBeenCalledWith("acc-uuid-101", { signal: expect.any(AbortSignal) });
      expect(result.current.data?.id).toBe("acc-uuid-101");
      expect(result.current.data?.status).toBe("ACTIVE");
    });

    it("is disabled when accountId is missing or undefined", () => {
      const getSpy = vi.spyOn(adminApi, "getAdminAccount");

      const { result } = renderHook(() => useAdminAccount(undefined), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("is disabled when accountId is whitespace-only", () => {
      const getSpy = vi.spyOn(adminApi, "getAdminAccount");

      const { result } = renderHook(() => useAdminAccount("   "), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("surfaces 404 Not Found error properly", async () => {
      const notFoundError = makeApiError(
        404,
        "Not Found",
        "Account not found",
        "ACCOUNT_NOT_FOUND"
      );
      vi.spyOn(adminApi, "getAdminAccount").mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useAdminAccount("non-existent"), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(notFoundError);
      expect((result.current.error as ApiError).status).toBe(404);
      expect(result.current.error?.message).toBe("Account not found");
    });

    it("surfaces 403 Forbidden error properly", async () => {
      const forbiddenError = makeApiError(
        403,
        "Forbidden",
        "Access Denied",
        "ACCESS_DENIED"
      );
      vi.spyOn(adminApi, "getAdminAccount").mockRejectedValue(forbiddenError);

      const { result } = renderHook(() => useAdminAccount("acc-uuid-101"), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as ApiError).status).toBe(403);
      expect(result.current.error?.message).toBe("Access Denied");
    });
  });

  // ==========================================================================
  // 4. useAdminAccountBalanceSummary & Financial Integrity
  // ==========================================================================
  describe("useAdminAccountBalanceSummary", () => {
    it("fetches consistent balance summary data", async () => {
      const getSpy = vi
        .spyOn(adminApi, "getAdminAccountBalanceSummary")
        .mockResolvedValue(mockConsistentBalanceSummary);

      const { result } = renderHook(
        () => useAdminAccountBalanceSummary("acc-uuid-101"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getSpy).toHaveBeenCalledWith("acc-uuid-101", { signal: expect.any(AbortSignal) });
      expect(result.current.data?.isConsistent).toBe(true);
      expect(result.current.data?.differenceMinor).toBe(0);
      expect(result.current.data?.materializedBalanceMinor).toBe(50000);
      expect(result.current.data?.authoritativeLedgerBalanceMinor).toBe(50000);
    });

    it("fetches discrepant balance summary without altering data", async () => {
      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(
        mockDiscrepantBalanceSummary
      );

      const { result } = renderHook(
        () => useAdminAccountBalanceSummary("acc-uuid-101"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.isConsistent).toBe(false);
      expect(result.current.data?.differenceMinor).toBe(1500);
      expect(result.current.data?.materializedBalanceMinor).toBe(50000);
      expect(result.current.data?.authoritativeLedgerBalanceMinor).toBe(48500);
    });

    it("is disabled when accountId is missing or whitespace-only", () => {
      const getSpy = vi.spyOn(adminApi, "getAdminAccountBalanceSummary");

      const { result: res1 } = renderHook(() => useAdminAccountBalanceSummary(undefined), { wrapper });
      expect(res1.current.fetchStatus).toBe("idle");

      const { result: res2 } = renderHook(() => useAdminAccountBalanceSummary("  "), { wrapper });
      expect(res2.current.fetchStatus).toBe("idle");

      expect(getSpy).not.toHaveBeenCalled();
    });

    // ========================================================================
    // CRITICAL FINANCIAL INTEGRITY VERIFICATION
    // ========================================================================
    it("FINANCIAL INTEGRITY: hook preserves backend figures with zero client math", async () => {
      // Synthetic test payload where differenceMinor intentionally reflects arbitrary backend value
      const syntheticAuditPayload: AccountBalanceSummaryResponse = {
        accountId: "acc-uuid-101",
        accountNumber: "ACCT-101-USD",
        currency: "USD",
        materializedBalanceMinor: 100000,
        authoritativeLedgerBalanceMinor: 99000,
        differenceMinor: 1000,
        isConsistent: false,
      };

      vi.spyOn(adminApi, "getAdminAccountBalanceSummary").mockResolvedValue(syntheticAuditPayload);

      const { result } = renderHook(
        () => useAdminAccountBalanceSummary("acc-uuid-101"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Assert that hook directly returns exact backend object without recomputing or mutating
      expect(result.current.data).toBe(syntheticAuditPayload);
      expect(result.current.data?.differenceMinor).toBe(1000);
      expect(result.current.data?.isConsistent).toBe(false);
    });
  });

  // ==========================================================================
  // 5. useAdminAccountLifecycle (Freeze / Unfreeze Mutations)
  // ==========================================================================
  describe("useAdminAccountLifecycle", () => {
    it("freeze mutation invokes freezeAdminAccount and invalidates targeted queries", async () => {
      const freezeSpy = vi
        .spyOn(adminApi, "freezeAdminAccount")
        .mockResolvedValue(mockFrozenAccount);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useAdminAccountLifecycle(), { wrapper });

      await result.current.freeze({
        accountId: "acc-uuid-101",
        request: { reason: "Suspected account takeover" },
      });

      expect(freezeSpy).toHaveBeenCalledWith("acc-uuid-101", {
        reason: "Suspected account takeover",
      });

      // Check targeted cache invalidation
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: adminKeys.account("acc-uuid-101"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: adminKeys.balanceSummary("acc-uuid-101"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: adminKeys.accounts(),
      });
    });

    it("freezeAccount convenience method calls freeze mutation", async () => {
      const freezeSpy = vi
        .spyOn(adminApi, "freezeAdminAccount")
        .mockResolvedValue(mockFrozenAccount);

      const { result } = renderHook(() => useAdminAccountLifecycle(), { wrapper });

      const res = await result.current.freezeAccount("acc-uuid-101", {
        reason: "Compliance review",
      });

      expect(freezeSpy).toHaveBeenCalledWith("acc-uuid-101", {
        reason: "Compliance review",
      });
      expect(res.status).toBe("FROZEN");
    });

    it("unfreeze mutation invokes unfreezeAdminAccount and invalidates targeted queries", async () => {
      const unfreezeSpy = vi
        .spyOn(adminApi, "unfreezeAdminAccount")
        .mockResolvedValue(mockAccount);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useAdminAccountLifecycle(), { wrapper });

      await result.current.unfreeze({
        accountId: "acc-uuid-101",
        request: { reason: "Identity verified successfully" },
      });

      expect(unfreezeSpy).toHaveBeenCalledWith("acc-uuid-101", {
        reason: "Identity verified successfully",
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: adminKeys.account("acc-uuid-101"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: adminKeys.balanceSummary("acc-uuid-101"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: adminKeys.accounts(),
      });
    });

    it("unfreezeAccount convenience method calls unfreeze mutation", async () => {
      const unfreezeSpy = vi
        .spyOn(adminApi, "unfreezeAdminAccount")
        .mockResolvedValue(mockAccount);

      const { result } = renderHook(() => useAdminAccountLifecycle(), { wrapper });

      const res = await result.current.unfreezeAccount("acc-uuid-101", {
        reason: "Verification complete",
      });

      expect(unfreezeSpy).toHaveBeenCalledWith("acc-uuid-101", {
        reason: "Verification complete",
      });
      expect(res.status).toBe("ACTIVE");
    });

    it("handles 400 Bad Request domain exception on freeze/unfreeze without retrying", async () => {
      const badRequestError = makeApiError(
        400,
        "Bad Request",
        "Cannot freeze a closed account",
        "ACCOUNT_CLOSED"
      );
      const freezeSpy = vi.spyOn(adminApi, "freezeAdminAccount").mockRejectedValue(badRequestError);

      const { result } = renderHook(() => useAdminAccountLifecycle(), { wrapper });

      await expect(
        result.current.freeze({
          accountId: "acc-closed-1",
          request: { reason: "Freeze closed account" },
        })
      ).rejects.toThrow("Cannot freeze a closed account");

      // Verify called exactly once: strictly no automatic replay
      expect(freezeSpy).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(result.current.freezeError).toBe(badRequestError);
      });
    });

    it("handles 409 Conflict optimistic lock error without automatic retry", async () => {
      const conflictError = makeApiError(
        409,
        "Conflict",
        "Optimistic lock conflict",
        "CONCURRENT_MODIFICATION"
      );
      const freezeSpy = vi
        .spyOn(adminApi, "freezeAdminAccount")
        .mockRejectedValue(conflictError);

      const { result } = renderHook(() => useAdminAccountLifecycle(), { wrapper });

      await expect(
        result.current.freeze({
          accountId: "acc-uuid-101",
          request: { reason: "Stale revision update" },
        })
      ).rejects.toThrow("Optimistic lock conflict");

      // Verify called exactly once: strictly no automatic replay
      expect(freezeSpy).toHaveBeenCalledTimes(1);
    });

    it("reset clears both mutation states", async () => {
      const badRequestError = makeApiError(
        400,
        "Bad Request",
        "Failed",
        "BAD_REQUEST"
      );
      vi.spyOn(adminApi, "freezeAdminAccount").mockRejectedValue(badRequestError);

      const { result } = renderHook(() => useAdminAccountLifecycle(), { wrapper });

      try {
        await result.current.freeze({
          accountId: "acc-uuid-101",
          request: { reason: "Test failure" },
        });
      } catch {
        // expected rejection
      }

      await waitFor(() => {
        expect(result.current.freezeError).not.toBeNull();
      });

      result.current.reset();

      await waitFor(() => {
        expect(result.current.freezeError).toBeNull();
        expect(result.current.unfreezeError).toBeNull();
      });
    });
  });

  // ==========================================================================
  // 6. Query Key Determinism & Isolation Tests
  // ==========================================================================
  describe("Admin Account Query Key Tests", () => {
    it("adminKeys.accounts(params) generates deterministic, stable keys", () => {
      const key1 = adminKeys.accounts({ page: 0, size: 20 });
      const key2 = adminKeys.accounts({ page: 0, size: 20 });

      expect(key1).toEqual(key2);
      expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
    });

    it("adminKeys.accounts produces distinct keys for distinct parameters", () => {
      const keyA = adminKeys.accounts({ status: "ACTIVE" });
      const keyB = adminKeys.accounts({ status: "FROZEN" });
      const keyC = adminKeys.accounts({ page: 1, size: 20 });

      expect(keyA).not.toEqual(keyB);
      expect(keyA).not.toEqual(keyC);
    });

    it("adminKeys.account is distinct per account ID", () => {
      const key1 = adminKeys.account("acc-1");
      const key2 = adminKeys.account("acc-2");

      expect(key1).toEqual(["admin", "account", "acc-1"]);
      expect(key2).toEqual(["admin", "account", "acc-2"]);
      expect(key1).not.toEqual(key2);
    });

    it("adminKeys.balanceSummary is distinct per account ID", () => {
      const key1 = adminKeys.balanceSummary("acc-1");
      const key2 = adminKeys.balanceSummary("acc-2");

      expect(key1).toEqual(["admin", "account-balance-summary", "acc-1"]);
      expect(key2).toEqual(["admin", "account-balance-summary", "acc-2"]);
      expect(key1).not.toEqual(key2);
    });
  });
});
