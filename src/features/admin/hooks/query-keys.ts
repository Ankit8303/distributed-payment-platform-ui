/**
 * Phase F7-B Admin Query Key Factory
 * Deterministic, hierarchical query keys for all administrative endpoints.
 * Namespace: 'admin'
 * Guarantees no accidental cache collisions between administrative queries.
 */

import type {
  PageableParams,
  PaymentQueryParams,
  LedgerQueryParams,
  AccountQueryParams,
  RefundQueryParams,
  PayoutQueryParams,
  ReconciliationQueryParams,
  NotificationQueryParams,
  AuditQueryParams,
  UserQueryParams,
} from "@/types/admin";

export const adminKeys = {
  all: ["admin"] as const,

  // 1. Dashboard
  dashboard: () => [...adminKeys.all, "dashboard"] as const,

  // 2. Payments
  payments: (params?: PaymentQueryParams) =>
    [...adminKeys.all, "payments", params ? { ...params } : {}] as const,
  payment: (id: string) => [...adminKeys.all, "payment", id] as const,

  // 3. Investigation
  investigation: (paymentId: string) =>
    [...adminKeys.all, "investigation", paymentId] as const,

  // 4. Ledger
  ledgerTransactions: (params?: LedgerQueryParams) =>
    [...adminKeys.all, "ledger-transactions", params ? { ...params } : {}] as const,
  ledgerTransaction: (id: string) =>
    [...adminKeys.all, "ledger-transaction", id] as const,
  accountEntries: (accountId: string, params?: PageableParams) =>
    [...adminKeys.all, "account-entries", accountId, params ? { ...params } : {}] as const,

  // 5. Accounts
  accounts: (params?: AccountQueryParams) =>
    [...adminKeys.all, "accounts", params ? { ...params } : {}] as const,
  account: (id: string) => [...adminKeys.all, "account", id] as const,
  balanceSummary: (accountId: string) =>
    [...adminKeys.all, "account-balance-summary", accountId] as const,

  // 6. Adjustments
  adjustment: (id: string) => [...adminKeys.all, "adjustment", id] as const,

  // 7. Refunds
  refunds: (params?: RefundQueryParams) =>
    [...adminKeys.all, "refunds", params ? { ...params } : {}] as const,
  refund: (id: string) => [...adminKeys.all, "refund", id] as const,

  // 8. Payouts
  payouts: (params?: PayoutQueryParams) =>
    [...adminKeys.all, "payouts", params ? { ...params } : {}] as const,
  payout: (id: string) => [...adminKeys.all, "payout", id] as const,

  // 9. Reconciliation
  reconciliationCases: (params?: ReconciliationQueryParams) =>
    [...adminKeys.all, "reconciliation-cases", params ? { ...params } : {}] as const,
  reconciliationCase: (id: string) =>
    [...adminKeys.all, "reconciliation-case", id] as const,

  // 10. Notifications
  notifications: (params?: NotificationQueryParams) =>
    [...adminKeys.all, "notifications", params ? { ...params } : {}] as const,
  notification: (id: string) =>
    [...adminKeys.all, "notification", id] as const,

  // 11. Audit Logs
  auditLogs: (params?: AuditQueryParams) =>
    [...adminKeys.all, "audit-logs", params ? { ...params } : {}] as const,
  auditLog: (id: string) => [...adminKeys.all, "audit-log", id] as const,

  // 12. Users
  users: (params?: UserQueryParams) =>
    [...adminKeys.all, "users", params ? { ...params } : {}] as const,
  user: (id: string) => [...adminKeys.all, "user", id] as const,
};
