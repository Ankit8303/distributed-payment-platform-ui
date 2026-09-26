/**
 * Phase F7 Admin DTOs & Domain Types
 * Fully verified against frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`).
 * Financial invariant: All monetary amounts are integer minor units (long in Java, number in TS).
 */

import type { UserRole } from "./auth";
import type { BackendPaymentStatus } from "./payment";
import type { BackendRefundStatus } from "./refund";
import type { BackendPayoutStatus } from "./payout";
import type { AccountStatus, AccountType } from "./account";

export type { UserRole };
export type PaymentStatus = BackendPaymentStatus;
export type RefundStatus = BackendRefundStatus;
export type PayoutStatus = BackendPayoutStatus;

// ============================================================================
// Spring Data Pagination & Sort Models
// ============================================================================

export interface PageableSort {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}

export interface PageableObject {
  pageNumber: number;
  pageSize: number;
  sort: PageableSort;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface Page<T> {
  content: T[];
  pageable: PageableObject;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  sort: PageableSort;
  numberOfElements: number;
  empty: boolean;
}

export interface PageableParams {
  page?: number;
  size?: number;
  sort?: string; // e.g. "createdAt,desc"
}

// ============================================================================
// Dashboard DTOs
// ============================================================================

export interface DashboardSummaryResponse {
  totalUsers: number;
  totalAccounts: number;
  activeAccounts: number;
  frozenAccounts: number;
  totalPayments: number;
  settledPayments: number;
  failedPayments: number;
  pendingReconciliationPayments: number;
  openReconciliationCases: number;
  totalNotifications: number;
}

// ============================================================================
// Payment Operations DTOs
// ============================================================================

export interface PaymentAdminResponse {
  id: string; // UUID
  payerAccountId: string; // UUID
  payeeAccountId: string; // UUID
  amountMinor: number;
  feeMinor: number;
  currency: string;
  status: PaymentStatus;
  providerReference: string | null;
  idempotencyKey: string;
  idempotencyScope: string | null;
  createdAt: string; // ISO Instant
  updatedAt: string; // ISO Instant
}

export interface PaymentQueryParams extends PageableParams {
  status?: PaymentStatus;
  payerAccountId?: string;
  payeeAccountId?: string;
}

// ============================================================================
// Forensic Investigation DTOs
// ============================================================================

export interface OutboxEventSummary {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  status: string;
  topic: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface KafkaAuditSummary {
  id: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  correlationId: string | null;
  createdAt: string | null;
}

export interface NotificationSummary {
  id: string;
  eventId: string;
  channel: string;
  status: string;
  attemptCount: number;
  nextAttemptAt: string | null;
  recipientRedacted: string;
  createdAt: string;
}

export interface PaymentInvestigationTraceResponse {
  payment: PaymentAdminResponse;
  payerAccount: AccountAdminResponse | null;
  payeeAccount: AccountAdminResponse | null;
  ledgerTransaction: LedgerTransactionAdminResponse | null;
  outboxEvents: OutboxEventSummary[];
  kafkaAudits: KafkaAuditSummary[];
  reconciliationCases: ReconciliationCaseAdminResponse[];
  notifications: NotificationSummary[];
}

// ============================================================================
// Double-Entry Ledger DTOs
// ============================================================================

export type LedgerEntryDirection = "DEBIT" | "CREDIT";

export interface LedgerEntryAdminResponse {
  id: string; // UUID
  accountId: string; // UUID
  direction: LedgerEntryDirection;
  amountMinor: number;
  currency: string;
  sequenceNumber: number;
  createdAt: string;
}

export interface LedgerTransactionAdminResponse {
  id: string; // UUID
  sourceReferenceId: string; // UUID
  sourceReferenceType: string; // e.g. "PAYMENT", "REFUND", "PAYOUT", "SYSTEM_ADJUSTMENT"
  description: string | null;
  createdAt: string;
  entries: LedgerEntryAdminResponse[];
}

export interface LedgerQueryParams extends PageableParams {
  sourceReferenceType?: string;
}

// ============================================================================
// Account Governance DTOs
// ============================================================================

export interface AccountAdminResponse {
  id: string; // UUID
  accountNumber: string;
  ownerId: string; // UUID
  accountType: AccountType;
  currency: string;
  status: AccountStatus;
  materializedBalanceMinor: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalanceSummaryResponse {
  accountId: string; // UUID
  accountNumber: string;
  currency: string;
  materializedBalanceMinor: number;
  authoritativeLedgerBalanceMinor: number;
  differenceMinor: number;
  isConsistent: boolean;
}

export interface AccountLifecycleRequest {
  reason?: string;
}

export interface AccountQueryParams extends PageableParams {
  ownerId?: string;
  accountType?: AccountType;
  status?: AccountStatus;
}

// ============================================================================
// Financial Adjustment DTOs
// ============================================================================

export interface FinancialAdjustmentCreateRequest {
  sourceAccountId: string; // UUID
  targetAccountId: string; // UUID
  amountMinor: number;
  currency: string;
  reason: string;
}

export interface FinancialAdjustmentResponse {
  adjustmentId: string; // UUID
  sourceAccountId: string; // UUID
  targetAccountId: string; // UUID
  amountMinor: number;
  currency: string;
  reason: string;
  operatorId: string; // UUID
  compensatingLedgerTransactionId: string; // UUID
  createdAt: string;
}

// ============================================================================
// Refund & Payout Oversight DTOs
// ============================================================================

export interface RefundAdminResponse {
  id: string; // UUID
  paymentId: string; // UUID
  amountMinor: number;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefundQueryParams extends PageableParams {
  paymentId?: string;
  status?: RefundStatus;
}

export interface PayoutAdminResponse {
  id: string; // UUID
  accountId: string; // UUID
  amountMinor: number;
  currency: string;
  status: PayoutStatus;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutQueryParams extends PageableParams {
  accountId?: string;
  status?: PayoutStatus;
}

// ============================================================================
// Reconciliation Management DTOs
// ============================================================================

export type ReconciliationOperationType = "PAYMENT" | "REFUND" | "PAYOUT" | "REVERSAL";

export type ReconciliationStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RETRY_REQUIRED"
  | "RESOLVED"
  | "MANUAL_REVIEW";

export type DiscrepancyType =
  | "PROVIDER_SUCCESS_LOCAL_PENDING"
  | "PROVIDER_FAILURE_LOCAL_PENDING"
  | "PROVIDER_UNKNOWN"
  | "PROVIDER_MISMATCH"
  | "LOCAL_FINANCIAL_STATE_MISSING"
  | "LEDGER_STATE_MISMATCH"
  | "DUPLICATE_OPERATION"
  | "ALREADY_RESOLVED"
  | "NON_RECONCILABLE";

export interface ReconciliationCaseEntity {
  id: string; // UUID
  operationType: ReconciliationOperationType;
  operationId: string; // UUID
  providerReference: string | null;
  localStatus: string;
  providerStatus: string | null;
  discrepancyType: DiscrepancyType | null;
  reconciliationStatus: ReconciliationStatus;
  resolution: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  leaseWorkerId: string | null;
  leaseExpiresAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  correlationId: string | null;
}

export interface ReconciliationCaseAdminResponse {
  id: string; // UUID
  operationType: string;
  operationId: string; // UUID
  providerReference: string | null;
  localStatus: string;
  reconciliationStatus: string;
  discrepancyType: string | null;
  attemptCount: number;
  nextAttemptAt: string | null;
  resolvedAt: string | null;
  workerId: string | null;
  correlationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationAttemptAdminResponse {
  id: string; // UUID
  reconciliationCaseId: string; // UUID
  attemptNumber: number;
  workerId: string;
  providerStatus: string | null;
  discrepancyType: DiscrepancyType | null;
  actionTaken: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface ReconciliationCaseDetailResponse extends ReconciliationCaseEntity {
  attempts: ReconciliationAttemptAdminResponse[];
}

export interface ReconciliationQueryParams extends PageableParams {
  status?: ReconciliationStatus;
}

export interface AuditFinding {
  transactionId: string; // UUID
  findingType: string;
  description: string;
}

export interface LedgerAuditReport {
  transactionsAudited: number;
  findingsCount: number;
  findings: AuditFinding[];
}

export interface BalanceFinding {
  accountId: string; // UUID
  materializedBalance: number;
  calculatedLedgerBalance: number;
  delta: number;
}

export interface BalanceAuditReport {
  accountsAudited: number;
  findingsCount: number;
  findings: BalanceFinding[];
}

export type ReconciliationLedgerAuditReport = LedgerAuditReport;
export type ReconciliationBalanceAuditReport = BalanceAuditReport;

// ============================================================================
// Notification Oversight DTOs
// ============================================================================

export type NotificationChannel = "EMAIL" | "SMS" | "WEBHOOK";

export type NotificationStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "EXHAUSTED";

export interface NotificationEntity {
  id: string; // UUID
  eventId: string; // UUID
  eventType: string;
  aggregateId: string;
  recipient: string;
  channel: NotificationChannel;
  templateCode: string;
  templateVersion: number;
  status: NotificationStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  leaseWorkerId: string | null;
  leaseExpiresAt: string | null;
  renderedSubject: string | null;
  renderedBody: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
}

export interface NotificationDeliveryEntity {
  id: string; // UUID
  notificationId: string; // UUID
  attemptNumber: number;
  workerId: string;
  channel: NotificationChannel;
  status: string;
  providerStatus: string | null;
  httpStatusCode: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface NotificationDetailResponse {
  notification: NotificationEntity;
  deliveries: NotificationDeliveryEntity[];
}

export interface NotificationQueryParams extends PageableParams {
  status?: NotificationStatus;
}

export type NotificationAdminResponse = NotificationEntity;

export interface NotificationWorkerParams {
  limit?: number;
}

// ============================================================================
// Security Audit Log DTOs
// ============================================================================

export interface AdminAuditLogResponse {
  id: string; // UUID
  actorUserId: string; // UUID
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string | null;
  correlationId: string | null;
  requestId: string | null;
  beforeState: string | null;
  afterState: string | null;
  createdAt: string;
  metadata: string | null;
}

export interface AuditQueryParams extends PageableParams {
  action?: string;
  resourceType?: string;
  resourceId?: string;
}

// ============================================================================
// User Directory DTOs
// ============================================================================

export type UserStatus = "ACTIVE" | "SUSPENDED" | "LOCKED" | "DELETED";

export interface UserAdminResponse {
  id: string; // UUID
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserQueryParams extends PageableParams {
  role?: UserRole;
  status?: UserStatus;
  email?: string;
}
