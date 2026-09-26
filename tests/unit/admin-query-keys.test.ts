import { describe, it, expect } from "vitest";
import { adminKeys } from "@/features/admin/hooks/query-keys";

describe("Admin Query Keys Factory", () => {
  it("generates consistent root query key", () => {
    expect(adminKeys.all).toEqual(["admin"]);
  });

  describe("Dashboard Keys", () => {
    it("generates deterministic dashboard key", () => {
      expect(adminKeys.dashboard()).toEqual(["admin", "dashboard"]);
    });
  });

  describe("Payment Keys", () => {
    it("generates payments key without parameters", () => {
      expect(adminKeys.payments()).toEqual(["admin", "payments", {}]);
    });

    it("generates deterministic payments key with query parameters", () => {
      const params = { status: "SETTLED" as const, page: 1, size: 20 };
      expect(adminKeys.payments(params)).toEqual(["admin", "payments", params]);
    });

    it("generates deterministic payment detail key", () => {
      const paymentId = "pay-123e4567";
      expect(adminKeys.payment(paymentId)).toEqual(["admin", "payment", paymentId]);
    });

    it("generates deterministic payment investigation key", () => {
      const paymentId = "pay-123e4567";
      expect(adminKeys.investigation(paymentId)).toEqual([
        "admin",
        "investigation",
        paymentId,
      ]);
    });
  });

  describe("Ledger Keys", () => {
    it("generates ledger transactions key with and without params", () => {
      expect(adminKeys.ledgerTransactions()).toEqual([
        "admin",
        "ledger-transactions",
        {},
      ]);
      const params = { sourceReferenceType: "PAYMENT" as const, page: 0, size: 50 };
      expect(adminKeys.ledgerTransactions(params)).toEqual([
        "admin",
        "ledger-transactions",
        params,
      ]);
    });

    it("generates ledger transaction detail key", () => {
      const txId = "tx-123";
      expect(adminKeys.ledgerTransaction(txId)).toEqual([
        "admin",
        "ledger-transaction",
        txId,
      ]);
    });

    it("generates account ledger entries key", () => {
      const accId = "acc-456";
      const params = { page: 0, size: 20 };
      expect(adminKeys.accountEntries(accId, params)).toEqual([
        "admin",
        "account-entries",
        accId,
        params,
      ]);
    });
  });

  describe("Account Keys", () => {
    it("generates accounts list key", () => {
      const params = { accountType: "CUSTOMER" as const, status: "ACTIVE" as const };
      expect(adminKeys.accounts(params)).toEqual(["admin", "accounts", params]);
    });

    it("generates account detail key", () => {
      const accId = "acc-789";
      expect(adminKeys.account(accId)).toEqual(["admin", "account", accId]);
    });

    it("generates balance summary key", () => {
      const accId = "acc-789";
      expect(adminKeys.balanceSummary(accId)).toEqual([
        "admin",
        "account-balance-summary",
        accId,
      ]);
    });
  });

  describe("Adjustment Keys", () => {
    it("generates adjustment detail key", () => {
      const adjId = "adj-001";
      expect(adminKeys.adjustment(adjId)).toEqual(["admin", "adjustment", adjId]);
    });
  });

  describe("Refund Keys", () => {
    it("generates refunds list key", () => {
      const params = { status: "SETTLED" as const, page: 0 };
      expect(adminKeys.refunds(params)).toEqual(["admin", "refunds", params]);
    });

    it("generates refund detail key", () => {
      const refId = "ref-111";
      expect(adminKeys.refund(refId)).toEqual(["admin", "refund", refId]);
    });
  });

  describe("Payout Keys", () => {
    it("generates payouts list key", () => {
      const params = { status: "PROCESSING" as const };
      expect(adminKeys.payouts(params)).toEqual(["admin", "payouts", params]);
    });

    it("generates payout detail key", () => {
      const payId = "payout-222";
      expect(adminKeys.payout(payId)).toEqual(["admin", "payout", payId]);
    });
  });

  describe("Reconciliation Keys", () => {
    it("generates reconciliation cases list key", () => {
      const params = { status: "OPEN" as const };
      expect(adminKeys.reconciliationCases(params)).toEqual([
        "admin",
        "reconciliation-cases",
        params,
      ]);
    });

    it("generates reconciliation case detail key", () => {
      const caseId = "case-333";
      expect(adminKeys.reconciliationCase(caseId)).toEqual([
        "admin",
        "reconciliation-case",
        caseId,
      ]);
    });
  });

  describe("Notification Keys", () => {
    it("generates notifications list key", () => {
      const params = { status: "PENDING" as const };
      expect(adminKeys.notifications(params)).toEqual([
        "admin",
        "notifications",
        params,
      ]);
    });

    it("generates notification detail key", () => {
      const notifId = "notif-444";
      expect(adminKeys.notification(notifId)).toEqual([
        "admin",
        "notification",
        notifId,
      ]);
    });
  });

  describe("Audit Log Keys", () => {
    it("generates audit logs list key", () => {
      const params = { action: "ACCOUNT_FREEZE", resourceType: "ACCOUNT" };
      expect(adminKeys.auditLogs(params)).toEqual(["admin", "audit-logs", params]);
    });

    it("generates audit log detail key", () => {
      const logId = "log-555";
      expect(adminKeys.auditLog(logId)).toEqual(["admin", "audit-log", logId]);
    });
  });

  describe("User Keys", () => {
    it("generates users list key", () => {
      const params = { role: "ADMIN" as const, status: "ACTIVE" as const };
      expect(adminKeys.users(params)).toEqual(["admin", "users", params]);
    });

    it("generates user detail key", () => {
      const userId = "usr-666";
      expect(adminKeys.user(userId)).toEqual(["admin", "user", userId]);
    });
  });

  describe("Query Key Uniqueness & Collision Prevention", () => {
    it("ensures no cross-domain key collisions with identical IDs", () => {
      const testId = "shared-uuid-1234";

      const keyStrings = [
        JSON.stringify(adminKeys.dashboard()),
        JSON.stringify(adminKeys.payment(testId)),
        JSON.stringify(adminKeys.investigation(testId)),
        JSON.stringify(adminKeys.ledgerTransaction(testId)),
        JSON.stringify(adminKeys.account(testId)),
        JSON.stringify(adminKeys.balanceSummary(testId)),
        JSON.stringify(adminKeys.adjustment(testId)),
        JSON.stringify(adminKeys.refund(testId)),
        JSON.stringify(adminKeys.payout(testId)),
        JSON.stringify(adminKeys.reconciliationCase(testId)),
        JSON.stringify(adminKeys.notification(testId)),
        JSON.stringify(adminKeys.auditLog(testId)),
        JSON.stringify(adminKeys.user(testId)),
      ];

      const uniqueSet = new Set(keyStrings);
      expect(uniqueSet.size).toBe(keyStrings.length);
    });
  });
});
