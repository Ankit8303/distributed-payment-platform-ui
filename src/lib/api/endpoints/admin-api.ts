/**
 * Phase F7-B Admin API Client
 * Strictly verified against frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`).
 * Reuses core apiFetch() and error handling infrastructure.
 * Enforces money safety: All financial values transported as integer minor units.
 * Idempotency: Financial mutations strictly caller-controlled; no automatic mutation retry.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";
import type {
  Page,
  PageableParams,
  DashboardSummaryResponse,
  PaymentAdminResponse,
  PaymentQueryParams,
  PaymentInvestigationTraceResponse,
  LedgerTransactionAdminResponse,
  LedgerEntryAdminResponse,
  LedgerQueryParams,
  AccountAdminResponse,
  AccountBalanceSummaryResponse,
  AccountQueryParams,
  AccountLifecycleRequest,
  FinancialAdjustmentCreateRequest,
  FinancialAdjustmentResponse,
  RefundAdminResponse,
  RefundQueryParams,
  PayoutAdminResponse,
  PayoutQueryParams,
  ReconciliationCaseAdminResponse,
  ReconciliationCaseDetailResponse,
  ReconciliationQueryParams,
  ReconciliationLedgerAuditReport,
  ReconciliationBalanceAuditReport,
  NotificationAdminResponse,
  NotificationDetailResponse,
  NotificationQueryParams,
  NotificationWorkerParams,
  AdminAuditLogResponse,
  AuditQueryParams,
  UserAdminResponse,
  UserQueryParams,
} from "@/types/admin";

/**
 * Serializes query parameters into a standard URL search string.
 * Omits undefined, null, or empty string values.
 * Clamps pagination size between 1 and 100.
 */
export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (key === "size" && typeof value === "number") {
      // Backend maximum size clamp: 100
      const clampedSize = Math.max(1, Math.min(value, 100));
      searchParams.set(key, clampedSize.toString());
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

// ============================================================================
// 1. Dashboard (AdminDashboardController)
// ============================================================================

/**
 * GET /api/v1/admin/dashboard/summary
 * Retrieves aggregated system-wide counts and balance metrics.
 */
export async function getAdminDashboardSummary(
  options?: RequestOptions
): Promise<DashboardSummaryResponse> {
  return apiFetch<DashboardSummaryResponse>(
    "/api/v1/admin/dashboard/summary",
    {
      method: "GET",
      ...options,
    }
  );
}

// ============================================================================
// 2. Payments (AdminPaymentController)
// ============================================================================

/**
 * GET /api/v1/admin/payments
 * Retrieves paginated list of system payments with optional status and account filters.
 */
export async function getAdminPayments(
  params?: PaymentQueryParams,
  options?: RequestOptions
): Promise<Page<PaymentAdminResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<PaymentAdminResponse>>(
    `/api/v1/admin/payments${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/payments/{id}
 * Retrieves detailed administrative payment view by ID.
 */
export async function getAdminPayment(
  paymentId: string,
  options?: RequestOptions
): Promise<PaymentAdminResponse> {
  const normalizedId = paymentId.trim();
  if (!normalizedId) {
    throw new Error("Payment ID is required");
  }
  return apiFetch<PaymentAdminResponse>(
    `/api/v1/admin/payments/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

// ============================================================================
// 3. Payment Investigation (AdminInvestigationController)
// ============================================================================

/**
 * GET /api/v1/admin/investigations/payments/{paymentId}
 * Retrieves an end-to-end investigation trace for a specific payment, including
 * outbox events, Kafka audit logs, notifications, and balance audits.
 */
export async function getAdminPaymentInvestigation(
  paymentId: string,
  options?: RequestOptions
): Promise<PaymentInvestigationTraceResponse> {
  const normalizedId = paymentId.trim();
  if (!normalizedId) {
    throw new Error("Payment ID is required");
  }
  return apiFetch<PaymentInvestigationTraceResponse>(
    `/api/v1/admin/investigations/payments/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

// ============================================================================
// 4. Ledger (AdminLedgerController)
// ============================================================================

/**
 * GET /api/v1/admin/ledger/transactions
 * Retrieves paginated double-entry ledger transactions with optional sourceReferenceType filter.
 */
export async function getAdminLedgerTransactions(
  params?: LedgerQueryParams,
  options?: RequestOptions
): Promise<Page<LedgerTransactionAdminResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<LedgerTransactionAdminResponse>>(
    `/api/v1/admin/ledger/transactions${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/ledger/transactions/{id}
 * Retrieves single ledger transaction by UUID including all balanced entry legs.
 */
export async function getAdminLedgerTransaction(
  transactionId: string,
  options?: RequestOptions
): Promise<LedgerTransactionAdminResponse> {
  const normalizedId = transactionId.trim();
  if (!normalizedId) {
    throw new Error("Transaction ID is required");
  }
  return apiFetch<LedgerTransactionAdminResponse>(
    `/api/v1/admin/ledger/transactions/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/ledger/accounts/{accountId}/entries
 * Retrieves paginated ledger entry legs for a specific account.
 */
export async function getAdminAccountLedgerEntries(
  accountId: string,
  params?: PageableParams,
  options?: RequestOptions
): Promise<Page<LedgerEntryAdminResponse>> {
  const normalizedId = accountId.trim();
  if (!normalizedId) {
    throw new Error("Account ID is required");
  }
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<LedgerEntryAdminResponse>>(
    `/api/v1/admin/ledger/accounts/${encodeURIComponent(normalizedId)}/entries${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

// ============================================================================
// 5. Accounts (AdminAccountController)
// ============================================================================

/**
 * GET /api/v1/admin/accounts
 * Retrieves paginated accounts with optional ownerId, accountType, and status filters.
 */
export async function getAdminAccounts(
  params?: AccountQueryParams,
  options?: RequestOptions
): Promise<Page<AccountAdminResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<AccountAdminResponse>>(
    `/api/v1/admin/accounts${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/accounts/{id}
 * Retrieves single administrative account view by UUID.
 */
export async function getAdminAccount(
  accountId: string,
  options?: RequestOptions
): Promise<AccountAdminResponse> {
  const normalizedId = accountId.trim();
  if (!normalizedId) {
    throw new Error("Account ID is required");
  }
  return apiFetch<AccountAdminResponse>(
    `/api/v1/admin/accounts/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/accounts/{id}/balance-summary
 * Retrieves dual-balance summary (account-table balance vs immutable-ledger calculated balance).
 */
export async function getAdminAccountBalanceSummary(
  accountId: string,
  options?: RequestOptions
): Promise<AccountBalanceSummaryResponse> {
  const normalizedId = accountId.trim();
  if (!normalizedId) {
    throw new Error("Account ID is required");
  }
  return apiFetch<AccountBalanceSummaryResponse>(
    `/api/v1/admin/accounts/${encodeURIComponent(normalizedId)}/balance-summary`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/accounts/{id}/freeze
 * Freezes an active account with a required audit reason.
 */
export async function freezeAdminAccount(
  accountId: string,
  request: AccountLifecycleRequest,
  options?: RequestOptions
): Promise<AccountAdminResponse> {
  const normalizedId = accountId.trim();
  if (!normalizedId) {
    throw new Error("Account ID is required");
  }
  if (!request.reason || !request.reason.trim()) {
    throw new Error("Freeze reason is required");
  }
  return apiFetch<AccountAdminResponse>(
    `/api/v1/admin/accounts/${encodeURIComponent(normalizedId)}/freeze`,
    {
      method: "POST",
      body: JSON.stringify(request),
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/accounts/{id}/unfreeze
 * Unfreezes a frozen account with a required audit reason.
 */
export async function unfreezeAdminAccount(
  accountId: string,
  request: AccountLifecycleRequest,
  options?: RequestOptions
): Promise<AccountAdminResponse> {
  const normalizedId = accountId.trim();
  if (!normalizedId) {
    throw new Error("Account ID is required");
  }
  if (!request.reason || !request.reason.trim()) {
    throw new Error("Unfreeze reason is required");
  }
  return apiFetch<AccountAdminResponse>(
    `/api/v1/admin/accounts/${encodeURIComponent(normalizedId)}/unfreeze`,
    {
      method: "POST",
      body: JSON.stringify(request),
      ...options,
    }
  );
}

// ============================================================================
// 6. Financial Adjustments (AdminAdjustmentController)
// ============================================================================

/**
 * POST /api/v1/admin/adjustments
 * Creates an administrative financial adjustment (manual credit/debit with balanced ledger entries).
 * Requires caller-supplied Idempotency-Key.
 * NEVER silently retries financial mutations.
 */
export async function createAdminFinancialAdjustment(
  request: FinancialAdjustmentCreateRequest,
  idempotencyKey: string,
  options?: RequestOptions
): Promise<FinancialAdjustmentResponse> {
  const normalizedKey = idempotencyKey?.trim();
  if (!normalizedKey) {
    throw new Error("Idempotency key is required for financial adjustments");
  }
  return apiFetch<FinancialAdjustmentResponse>(
    "/api/v1/admin/adjustments",
    {
      method: "POST",
      idempotencyKey: normalizedKey,
      body: JSON.stringify(request),
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/adjustments/{id}
 * Retrieves financial adjustment record by UUID.
 */
export async function getAdminFinancialAdjustment(
  adjustmentId: string,
  options?: RequestOptions
): Promise<FinancialAdjustmentResponse> {
  const normalizedId = adjustmentId.trim();
  if (!normalizedId) {
    throw new Error("Adjustment ID is required");
  }
  return apiFetch<FinancialAdjustmentResponse>(
    `/api/v1/admin/adjustments/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

// ============================================================================
// 7. Refunds (AdminRefundController)
// ============================================================================

/**
 * GET /api/v1/admin/refunds
 * Retrieves paginated refund records with optional paymentId and status filters.
 */
export async function getAdminRefunds(
  params?: RefundQueryParams,
  options?: RequestOptions
): Promise<Page<RefundAdminResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<RefundAdminResponse>>(
    `/api/v1/admin/refunds${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/refunds/{id}
 * Retrieves single refund administrative view by UUID.
 */
export async function getAdminRefund(
  refundId: string,
  options?: RequestOptions
): Promise<RefundAdminResponse> {
  const normalizedId = refundId.trim();
  if (!normalizedId) {
    throw new Error("Refund ID is required");
  }
  return apiFetch<RefundAdminResponse>(
    `/api/v1/admin/refunds/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

// ============================================================================
// 8. Payouts (AdminPayoutController)
// ============================================================================

/**
 * GET /api/v1/admin/payouts
 * Retrieves paginated payout records with optional accountId and status filters.
 */
export async function getAdminPayouts(
  params?: PayoutQueryParams,
  options?: RequestOptions
): Promise<Page<PayoutAdminResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<PayoutAdminResponse>>(
    `/api/v1/admin/payouts${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/payouts/{id}
 * Retrieves single payout administrative view by UUID.
 */
export async function getAdminPayout(
  payoutId: string,
  options?: RequestOptions
): Promise<PayoutAdminResponse> {
  const normalizedId = payoutId.trim();
  if (!normalizedId) {
    throw new Error("Payout ID is required");
  }
  return apiFetch<PayoutAdminResponse>(
    `/api/v1/admin/payouts/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

// ============================================================================
// 9. Reconciliation (AdminReconciliationController)
// ============================================================================

/**
 * GET /api/v1/admin/reconciliation/cases
 * Retrieves paginated reconciliation cases with optional status filter.
 */
export async function getAdminReconciliationCases(
  params?: ReconciliationQueryParams,
  options?: RequestOptions
): Promise<Page<ReconciliationCaseAdminResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<ReconciliationCaseAdminResponse>>(
    `/api/v1/admin/reconciliation/cases${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/reconciliation/cases/{id}
 * Retrieves detailed reconciliation case by UUID including execution attempts.
 */
export async function getAdminReconciliationCase(
  caseId: string,
  options?: RequestOptions
): Promise<ReconciliationCaseDetailResponse> {
  const normalizedId = caseId.trim();
  if (!normalizedId) {
    throw new Error("Case ID is required");
  }
  return apiFetch<ReconciliationCaseDetailResponse>(
    `/api/v1/admin/reconciliation/cases/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/reconciliation/cases/{id}/trigger
 * Manually triggers execution for a reconciliation case.
 */
export async function triggerAdminReconciliationCase(
  caseId: string,
  options?: RequestOptions
): Promise<ReconciliationCaseAdminResponse> {
  const normalizedId = caseId.trim();
  if (!normalizedId) {
    throw new Error("Case ID is required");
  }
  return apiFetch<ReconciliationCaseAdminResponse>(
    `/api/v1/admin/reconciliation/cases/${encodeURIComponent(normalizedId)}/trigger`,
    {
      method: "POST",
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/reconciliation/cases/{id}/retry
 * Retries a failed or stalled reconciliation case.
 */
export async function retryAdminReconciliationCase(
  caseId: string,
  options?: RequestOptions
): Promise<ReconciliationCaseDetailResponse> {
  const normalizedId = caseId.trim();
  if (!normalizedId) {
    throw new Error("Case ID is required");
  }
  return apiFetch<ReconciliationCaseDetailResponse>(
    `/api/v1/admin/reconciliation/cases/${encodeURIComponent(normalizedId)}/retry`,
    {
      method: "POST",
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/reconciliation/run
 * Executes the system-wide reconciliation sweep worker. Returns count of processed cases.
 */
export async function runAdminReconciliation(
  options?: RequestOptions
): Promise<number> {
  return apiFetch<number>(
    "/api/v1/admin/reconciliation/run",
    {
      method: "POST",
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/reconciliation/audit/ledger
 * Runs an asynchronous ledger zero-sum debit/credit balance consistency audit.
 */
export async function auditAdminReconciliationLedger(
  options?: RequestOptions
): Promise<ReconciliationLedgerAuditReport> {
  return apiFetch<ReconciliationLedgerAuditReport>(
    "/api/v1/admin/reconciliation/audit/ledger",
    {
      method: "POST",
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/reconciliation/audit/balances
 * Runs an account balance vs calculated ledger balance consistency audit.
 */
export async function auditAdminReconciliationBalances(
  options?: RequestOptions
): Promise<ReconciliationBalanceAuditReport> {
  return apiFetch<ReconciliationBalanceAuditReport>(
    "/api/v1/admin/reconciliation/audit/balances",
    {
      method: "POST",
      ...options,
    }
  );
}

// ============================================================================
// 10. Notifications (AdminNotificationController)
// ============================================================================

/**
 * GET /api/v1/admin/notifications
 * Retrieves paginated notification records with optional status filter.
 */
export async function getAdminNotifications(
  params?: NotificationQueryParams,
  options?: RequestOptions
): Promise<Page<NotificationAdminResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<NotificationAdminResponse>>(
    `/api/v1/admin/notifications${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/notifications/{id}
 * Retrieves detailed notification record by UUID including all delivery attempts.
 */
export async function getAdminNotification(
  notificationId: string,
  options?: RequestOptions
): Promise<NotificationDetailResponse> {
  const normalizedId = notificationId.trim();
  if (!normalizedId) {
    throw new Error("Notification ID is required");
  }
  return apiFetch<NotificationDetailResponse>(
    `/api/v1/admin/notifications/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/notifications/{id}/retry
 * Retries a failed notification dispatch.
 */
export async function retryAdminNotification(
  notificationId: string,
  options?: RequestOptions
): Promise<NotificationAdminResponse> {
  const normalizedId = notificationId.trim();
  if (!normalizedId) {
    throw new Error("Notification ID is required");
  }
  return apiFetch<NotificationAdminResponse>(
    `/api/v1/admin/notifications/${encodeURIComponent(normalizedId)}/retry`,
    {
      method: "POST",
      ...options,
    }
  );
}

/**
 * POST /api/v1/admin/notifications/run-worker
 * Triggers the notification background worker sweep with an optional batch limit (default 25).
 */
export async function runAdminNotificationWorker(
  params?: NotificationWorkerParams,
  options?: RequestOptions
): Promise<number> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<number>(
    `/api/v1/admin/notifications/run-worker${query}`,
    {
      method: "POST",
      ...options,
    }
  );
}

// ============================================================================
// 11. Audit Logs (AdminAuditController)
// ============================================================================

/**
 * GET /api/v1/admin/audit-logs
 * Retrieves paginated audit trail logs with optional action, resourceType, and resourceId filters.
 */
export async function getAdminAuditLogs(
  params?: AuditQueryParams,
  options?: RequestOptions
): Promise<Page<AdminAuditLogResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<AdminAuditLogResponse>>(
    `/api/v1/admin/audit-logs${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/audit-logs/{id}
 * Retrieves single audit log record by ID.
 */
export async function getAdminAuditLog(
  logId: string,
  options?: RequestOptions
): Promise<AdminAuditLogResponse> {
  const normalizedId = logId.trim();
  if (!normalizedId) {
    throw new Error("Audit log ID is required");
  }
  return apiFetch<AdminAuditLogResponse>(
    `/api/v1/admin/audit-logs/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}

// ============================================================================
// 12. Users (AdminUserController)
// ============================================================================

/**
 * GET /api/v1/admin/users
 * Retrieves paginated users with optional role, status, and email filters.
 */
export async function getAdminUsers(
  params?: UserQueryParams,
  options?: RequestOptions
): Promise<Page<UserAdminResponse>> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiFetch<Page<UserAdminResponse>>(
    `/api/v1/admin/users${query}`,
    {
      method: "GET",
      ...options,
    }
  );
}

/**
 * GET /api/v1/admin/users/{id}
 * Retrieves single user administrative profile by UUID.
 */
export async function getAdminUser(
  userId: string,
  options?: RequestOptions
): Promise<UserAdminResponse> {
  const normalizedId = userId.trim();
  if (!normalizedId) {
    throw new Error("User ID is required");
  }
  return apiFetch<UserAdminResponse>(
    `/api/v1/admin/users/${encodeURIComponent(normalizedId)}`,
    {
      method: "GET",
      ...options,
    }
  );
}
