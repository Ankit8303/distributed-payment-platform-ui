import { describe, it, expect, vi, beforeEach } from "vitest";
import * as apiClient from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import {
  buildQueryString,
  getAdminDashboardSummary,
  getAdminPayments,
  getAdminPayment,
  getAdminPaymentInvestigation,
  getAdminLedgerTransactions,
  getAdminLedgerTransaction,
  getAdminAccountLedgerEntries,
  getAdminAccounts,
  getAdminAccount,
  getAdminAccountBalanceSummary,
  freezeAdminAccount,
  unfreezeAdminAccount,
  createAdminFinancialAdjustment,
  getAdminFinancialAdjustment,
  getAdminRefunds,
  getAdminRefund,
  getAdminPayouts,
  getAdminPayout,
  getAdminReconciliationCases,
  getAdminReconciliationCase,
  triggerAdminReconciliationCase,
  retryAdminReconciliationCase,
  runAdminReconciliation,
  auditAdminReconciliationLedger,
  auditAdminReconciliationBalances,
  getAdminNotifications,
  getAdminNotification,
  retryAdminNotification,
  runAdminNotificationWorker,
  getAdminAuditLogs,
  getAdminAuditLog,
  getAdminUsers,
  getAdminUser,
} from "@/lib/api/endpoints/admin-api";
import type {
  Page,
  DashboardSummaryResponse,
  PaymentAdminResponse,
  PaymentInvestigationTraceResponse,
  LedgerTransactionAdminResponse,
  LedgerEntryAdminResponse,
  AccountAdminResponse,
  AccountBalanceSummaryResponse,
  FinancialAdjustmentResponse,
  RefundAdminResponse,
  PayoutAdminResponse,
  ReconciliationCaseAdminResponse,
  ReconciliationCaseDetailResponse,
  NotificationAdminResponse,
  NotificationDetailResponse,
  AdminAuditLogResponse,
  UserAdminResponse,
} from "@/types/admin";

describe("Admin API Client Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Query String Serialization & Clamping
  // ==========================================================================
  describe("buildQueryString", () => {
    it("returns empty string when params is undefined or empty", () => {
      expect(buildQueryString()).toBe("");
      expect(buildQueryString({})).toBe("");
    });

    it("omits undefined, null, and empty string parameters", () => {
      const result = buildQueryString({
        status: "ACTIVE",
        role: undefined,
        ownerId: null,
        email: "",
      });
      expect(result).toBe("?status=ACTIVE");
    });

    it("clamps pagination size to max 100", () => {
      const result = buildQueryString({ page: 0, size: 500 });
      expect(result).toBe("?page=0&size=100");
    });

    it("clamps pagination size to minimum 1", () => {
      const result = buildQueryString({ page: 0, size: -5 });
      expect(result).toBe("?page=0&size=1");
    });

    it("serializes multiple query parameters deterministically", () => {
      const result = buildQueryString({
        page: 2,
        size: 25,
        sort: "createdAt,desc",
        status: "SETTLED",
      });
      expect(result).toContain("page=2");
      expect(result).toContain("size=25");
      expect(result).toContain("sort=createdAt%2Cdesc");
      expect(result).toContain("status=SETTLED");
    });
  });

  // ==========================================================================
  // 1. Dashboard API
  // ==========================================================================
  describe("Dashboard API", () => {
    it("fetches dashboard summary via GET /api/v1/admin/dashboard/summary", async () => {
      const mockSummary: DashboardSummaryResponse = {
        totalUsers: 45,
        totalAccounts: 80,
        activeAccounts: 78,
        frozenAccounts: 2,
        totalPayments: 1200,
        settledPayments: 1150,
        failedPayments: 30,
        pendingReconciliationPayments: 20,
        openReconciliationCases: 1,
        totalNotifications: 1500,
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockSummary);

      const result = await getAdminDashboardSummary();
      expect(result).toEqual(mockSummary);
      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/dashboard/summary",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  // ==========================================================================
  // 2. Payments API
  // ==========================================================================
  describe("Payments API", () => {
    it("fetches paginated payments with filters", async () => {
      const mockPage: Page<PaymentAdminResponse> = {
        content: [],
        pageable: { pageNumber: 0, pageSize: 20, offset: 0, paged: true, unpaged: false, sort: { sorted: false, unsorted: true, empty: true } },
        totalElements: 0,
        totalPages: 0,
        last: true,
        first: true,
        size: 20,
        number: 0,
        sort: { sorted: false, unsorted: true, empty: true },
        numberOfElements: 0,
        empty: true,
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockPage);

      const result = await getAdminPayments({
        status: "SETTLED",
        page: 0,
        size: 20,
      });

      expect(result).toEqual(mockPage);
      expect(apiFetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/v1\/admin\/payments\?/),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("fetches single payment by ID and rejects empty ID", async () => {
      const mockPayment: PaymentAdminResponse = {
        id: "pay-111",
        payerAccountId: "acc-1",
        payeeAccountId: "acc-2",
        amountMinor: 2500,
        feeMinor: 50,
        currency: "USD",
        status: "SETTLED",
        providerReference: "prov-111",
        idempotencyKey: "idem-111",
        idempotencyScope: "GLOBAL",
        createdAt: "2026-09-26T12:00:00Z",
        updatedAt: "2026-09-26T12:01:00Z",
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockPayment);

      const result = await getAdminPayment("pay-111");
      expect(result).toEqual(mockPayment);
      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/payments/pay-111",
        expect.objectContaining({ method: "GET" })
      );

      await expect(getAdminPayment("   ")).rejects.toThrow("Payment ID is required");
    });
  });

  // ==========================================================================
  // 3. Payment Investigation API
  // ==========================================================================
  describe("Investigation API", () => {
    it("fetches payment investigation trace and validates ID", async () => {
      const mockTrace: PaymentInvestigationTraceResponse = {
        payment: {
          id: "pay-111",
          payerAccountId: "acc-1",
          payeeAccountId: "acc-2",
          amountMinor: 2500,
          feeMinor: 50,
          currency: "USD",
          status: "SETTLED",
          providerReference: "prov-111",
          idempotencyKey: "idem-111",
          idempotencyScope: "GLOBAL",
          createdAt: "2026-09-26T12:00:00Z",
          updatedAt: "2026-09-26T12:01:00Z",
        },
        payerAccount: null,
        payeeAccount: null,
        ledgerTransaction: null,
        outboxEvents: [],
        kafkaAudits: [],
        reconciliationCases: [],
        notifications: [],
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockTrace);

      const result = await getAdminPaymentInvestigation("pay-111");
      expect(result).toEqual(mockTrace);
      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/investigations/payments/pay-111",
        expect.objectContaining({ method: "GET" })
      );

      await expect(getAdminPaymentInvestigation("")).rejects.toThrow(
        "Payment ID is required"
      );
    });
  });

  // ==========================================================================
  // 4. Ledger API
  // ==========================================================================
  describe("Ledger API", () => {
    it("fetches ledger transactions with filters", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<LedgerTransactionAdminResponse>);

      await getAdminLedgerTransactions({
        sourceReferenceType: "PAYMENT",
        page: 0,
        size: 50,
      });

      expect(apiFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/admin/ledger/transactions?"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("fetches single ledger transaction by ID", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ id: "tx-123" } as unknown as LedgerTransactionAdminResponse);

      const res = await getAdminLedgerTransaction("tx-123");
      expect(res.id).toBe("tx-123");
      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/ledger/transactions/tx-123",
        expect.objectContaining({ method: "GET" })
      );

      await expect(getAdminLedgerTransaction("")).rejects.toThrow("Transaction ID is required");
    });

    it("fetches account ledger entries and validates accountId", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<LedgerEntryAdminResponse>);

      await getAdminAccountLedgerEntries("acc-999", { page: 0, size: 20 });

      expect(apiFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/admin/ledger/accounts/acc-999/entries?"),
        expect.objectContaining({ method: "GET" })
      );

      await expect(getAdminAccountLedgerEntries("   ")).rejects.toThrow(
        "Account ID is required"
      );
    });
  });

  // ==========================================================================
  // 5. Accounts API
  // ==========================================================================
  describe("Accounts API", () => {
    it("fetches accounts list with parameters", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<AccountAdminResponse>);

      await getAdminAccounts({ accountType: "CUSTOMER", status: "ACTIVE" });

      expect(apiFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/admin/accounts?"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("fetches account detail and balance summary", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ id: "acc-1" } as unknown as AccountAdminResponse)
        .mockResolvedValueOnce({
          accountId: "acc-1",
          accountNumber: "ACC-001",
          currency: "USD",
          materializedBalanceMinor: 10000,
          authoritativeLedgerBalanceMinor: 10000,
          differenceMinor: 0,
          isConsistent: true,
        } as unknown as AccountBalanceSummaryResponse);

      const acc = await getAdminAccount("acc-1");
      expect(acc.id).toBe("acc-1");

      const bal = await getAdminAccountBalanceSummary("acc-1");
      expect(bal.isConsistent).toBe(true);
      expect(bal.differenceMinor).toBe(0);

      expect(apiFetchSpy).toHaveBeenCalledTimes(2);

      await expect(getAdminAccount("")).rejects.toThrow("Account ID is required");
      await expect(getAdminAccountBalanceSummary("")).rejects.toThrow("Account ID is required");
    });

    it("freezes account with required reason and sends POST body", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ id: "acc-1", status: "FROZEN" } as unknown as AccountAdminResponse);

      const res = await freezeAdminAccount("acc-1", {
        reason: "Compliance fraud audit",
      });

      expect(res.status).toBe("FROZEN");
      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/accounts/acc-1/freeze",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reason: "Compliance fraud audit" }),
        })
      );

      await expect(
        freezeAdminAccount("acc-1", { reason: "   " })
      ).rejects.toThrow("Freeze reason is required");
    });

    it("unfreezes account with required reason", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ id: "acc-1", status: "ACTIVE" } as unknown as AccountAdminResponse);

      const res = await unfreezeAdminAccount("acc-1", {
        reason: "Audit cleared",
      });

      expect(res.status).toBe("ACTIVE");
      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/accounts/acc-1/unfreeze",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reason: "Audit cleared" }),
        })
      );

      await expect(
        unfreezeAdminAccount("acc-1", { reason: "" })
      ).rejects.toThrow("Unfreeze reason is required");
    });
  });

  // ==========================================================================
  // 6. Financial Adjustments API
  // ==========================================================================
  describe("Financial Adjustments API", () => {
    it("creates financial adjustment with required caller-supplied Idempotency-Key", async () => {
      const mockAdjustmentResponse: FinancialAdjustmentResponse = {
        adjustmentId: "adj-123",
        sourceAccountId: "acc-1",
        targetAccountId: "acc-2",
        amountMinor: 5000,
        currency: "USD",
        reason: "Fee compensation",
        operatorId: "admin-uuid-1",
        compensatingLedgerTransactionId: "tx-456",
        createdAt: "2026-09-26T12:00:00Z",
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockAdjustmentResponse);

      const request = {
        sourceAccountId: "acc-1",
        targetAccountId: "acc-2",
        amountMinor: 5000,
        currency: "USD",
        reason: "Fee compensation",
      };

      const result = await createAdminFinancialAdjustment(
        request,
        "idem-adj-uuid-001"
      );

      expect(result).toEqual(mockAdjustmentResponse);
      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/adjustments",
        expect.objectContaining({
          method: "POST",
          idempotencyKey: "idem-adj-uuid-001",
          body: JSON.stringify(request),
        })
      );
    });

    it("rejects financial adjustment if idempotency key is missing or empty", async () => {
      const apiFetchSpy = vi.spyOn(apiClient, "apiFetch");

      await expect(
        createAdminFinancialAdjustment(
          {
            sourceAccountId: "acc-1",
            targetAccountId: "acc-2",
            amountMinor: 5000,
            currency: "USD",
            reason: "Fee compensation",
          },
          "   "
        )
      ).rejects.toThrow("Idempotency key is required for financial adjustments");

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it("fetches financial adjustment by ID", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ adjustmentId: "adj-123" } as unknown as FinancialAdjustmentResponse);

      const result = await getAdminFinancialAdjustment("adj-123");
      expect(result.adjustmentId).toBe("adj-123");
      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/adjustments/adj-123",
        expect.objectContaining({ method: "GET" })
      );

      await expect(getAdminFinancialAdjustment("")).rejects.toThrow(
        "Adjustment ID is required"
      );
    });
  });

  // ==========================================================================
  // 7. Refunds API
  // ==========================================================================
  describe("Refunds API", () => {
    it("fetches refunds list and detail by ID", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<RefundAdminResponse>)
        .mockResolvedValueOnce({ id: "ref-1" } as unknown as RefundAdminResponse);

      await getAdminRefunds({ status: "SETTLED" });
      const ref = await getAdminRefund("ref-1");

      expect(ref.id).toBe("ref-1");
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/v1/admin/refunds?"),
        expect.objectContaining({ method: "GET" })
      );
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        2,
        "/api/v1/admin/refunds/ref-1",
        expect.objectContaining({ method: "GET" })
      );

      await expect(getAdminRefund("")).rejects.toThrow("Refund ID is required");
    });
  });

  // ==========================================================================
  // 8. Payouts API
  // ==========================================================================
  describe("Payouts API", () => {
    it("fetches payouts list and detail by ID", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<PayoutAdminResponse>)
        .mockResolvedValueOnce({ id: "pay-1" } as unknown as PayoutAdminResponse);

      await getAdminPayouts({ status: "PROCESSING" });
      const payout = await getAdminPayout("pay-1");

      expect(payout.id).toBe("pay-1");
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/v1/admin/payouts?"),
        expect.objectContaining({ method: "GET" })
      );
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        2,
        "/api/v1/admin/payouts/pay-1",
        expect.objectContaining({ method: "GET" })
      );

      await expect(getAdminPayout("")).rejects.toThrow("Payout ID is required");
    });
  });

  // ==========================================================================
  // 9. Reconciliation API
  // ==========================================================================
  describe("Reconciliation API", () => {
    it("handles reconciliation cases, triggers, and retries", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<ReconciliationCaseAdminResponse>)
        .mockResolvedValueOnce({ id: "case-1" } as unknown as ReconciliationCaseDetailResponse)
        .mockResolvedValueOnce({ id: "case-1", reconciliationStatus: "RESOLVED" } as unknown as ReconciliationCaseAdminResponse)
        .mockResolvedValueOnce({ id: "case-1" } as unknown as ReconciliationCaseDetailResponse);

      await getAdminReconciliationCases({ status: "OPEN" });
      const detail = await getAdminReconciliationCase("case-1");
      const triggered = await triggerAdminReconciliationCase("case-1");
      const retried = await retryAdminReconciliationCase("case-1");

      expect(detail.id).toBe("case-1");
      expect(triggered.reconciliationStatus).toBe("RESOLVED");
      expect(retried.id).toBe("case-1");

      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        3,
        "/api/v1/admin/reconciliation/cases/case-1/trigger",
        expect.objectContaining({ method: "POST" })
      );
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        4,
        "/api/v1/admin/reconciliation/cases/case-1/retry",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("triggers reconciliation run sweep and audits", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce({ transactionsAudited: 100, findingsCount: 0, findings: [] })
        .mockResolvedValueOnce({ accountsAudited: 80, findingsCount: 0, findings: [] });

      const processed = await runAdminReconciliation();
      expect(processed).toBe(5);

      const ledgerReport = await auditAdminReconciliationLedger();
      expect(ledgerReport.findingsCount).toBe(0);

      const balanceReport = await auditAdminReconciliationBalances();
      expect(balanceReport.findingsCount).toBe(0);

      expect(apiFetchSpy).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // 10. Notifications API
  // ==========================================================================
  describe("Notifications API", () => {
    it("handles notification queries, detail, retry, and worker execution", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<NotificationAdminResponse>)
        .mockResolvedValueOnce({ notification: { id: "notif-1" }, deliveries: [] } as unknown as NotificationDetailResponse)
        .mockResolvedValueOnce({ id: "notif-1", status: "SENT" } as unknown as NotificationAdminResponse)
        .mockResolvedValueOnce(12);

      await getAdminNotifications({ status: "PENDING" });
      const notif = await getAdminNotification("notif-1");
      const retried = await retryAdminNotification("notif-1");
      const count = await runAdminNotificationWorker({ limit: 50 });

      expect(notif.notification.id).toBe("notif-1");
      expect(retried.status).toBe("SENT");
      expect(count).toBe(12);

      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        3,
        "/api/v1/admin/notifications/notif-1/retry",
        expect.objectContaining({ method: "POST" })
      );
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        4,
        "/api/v1/admin/notifications/run-worker?limit=50",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  // ==========================================================================
  // 11. Audit Logs API
  // ==========================================================================
  describe("Audit Logs API", () => {
    it("fetches audit logs with filtering and single log by ID", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<AdminAuditLogResponse>)
        .mockResolvedValueOnce({ id: "log-1" } as unknown as AdminAuditLogResponse);

      await getAdminAuditLogs({ action: "PAYMENT_REFUNDED" });
      const log = await getAdminAuditLog("log-1");

      expect(log.id).toBe("log-1");
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/v1/admin/audit-logs?"),
        expect.objectContaining({ method: "GET" })
      );
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        2,
        "/api/v1/admin/audit-logs/log-1",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  // ==========================================================================
  // 12. Users API
  // ==========================================================================
  describe("Users API", () => {
    it("fetches users list and single user by ID", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({ content: [] } as unknown as Page<UserAdminResponse>)
        .mockResolvedValueOnce({ id: "usr-1", email: "admin@platform.com" } as unknown as UserAdminResponse);

      await getAdminUsers({ role: "ADMIN" });
      const user = await getAdminUser("usr-1");

      expect(user.email).toBe("admin@platform.com");
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/v1/admin/users?"),
        expect.objectContaining({ method: "GET" })
      );
      expect(apiFetchSpy).toHaveBeenNthCalledWith(
        2,
        "/api/v1/admin/users/usr-1",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  // ==========================================================================
  // Correlation-ID & Request Options Propagation
  // ==========================================================================
  describe("Correlation & Request Options Propagation", () => {
    it("propagates correlationId and custom options to apiFetch", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce({} as unknown as DashboardSummaryResponse);

      await getAdminDashboardSummary({
        correlationId: "corr-admin-test-1234",
      });

      expect(apiFetchSpy).toHaveBeenCalledWith(
        "/api/v1/admin/dashboard/summary",
        expect.objectContaining({
          correlationId: "corr-admin-test-1234",
        })
      );
    });
  });

  // ==========================================================================
  // RFC 7807 Error Handling & No Mutation Retries
  // ==========================================================================
  describe("Error Handling & Mutation Safety", () => {
    it("propagates ApiError on backend failures without alteration", async () => {
      const errorData = {
        type: "https://api.paymentledger.com/errors/INSUFFICIENT_FUNDS",
        title: "Insufficient Funds",
        status: 400,
        detail: "Account does not have sufficient funds for debit",
        errorCode: "INSUFFICIENT_FUNDS",
        correlationId: "err-corr-1",
        timestamp: "2026-09-26T12:00:00Z",
      };

      vi.spyOn(apiClient, "apiFetch").mockRejectedValueOnce(
        new ApiError(errorData)
      );

      await expect(
        createAdminFinancialAdjustment(
          {
            sourceAccountId: "acc-1",
            targetAccountId: "acc-2",
            amountMinor: 99999999,
            currency: "USD",
            reason: "Recovery",
          },
          "idem-adj-fail"
        )
      ).rejects.toThrow("Account does not have sufficient funds for debit");
    });

    it("does not automatically retry mutations when an error occurs", async () => {
      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockRejectedValueOnce(new Error("Network disconnect"));

      await expect(
        freezeAdminAccount("acc-1", { reason: "Security violation" })
      ).rejects.toThrow("Network disconnect");

      expect(apiFetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
