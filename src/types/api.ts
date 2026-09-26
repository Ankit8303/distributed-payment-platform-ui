/**
 * API Contract Types for Distributed Payment & Ledger Platform
 * Compliant with RFC 7807 problem details specification.
 */

export interface InvalidParameter {
  field: string;
  reason: string;
}

export interface ApiErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errorCode: BackendErrorCode | string;
  correlationId?: string;
  timestamp: string;
  invalidParameters?: InvalidParameter[];
}

export type BackendErrorCode =
  // Infrastructure
  | "INVALID_PAYLOAD"
  | "RESOURCE_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR"
  // Authentication & Security
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH_TOKEN"
  // Account
  | "ACCOUNT_FROZEN"
  // Payment
  | "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH"
  | "IDEMPOTENCY_CONCURRENT_REQUEST"
  | "INSUFFICIENT_FUNDS"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PAYMENT_PENDING_RECONCILIATION"
  // Rate Limiting
  | "RATE_LIMIT_EXCEEDED"
  // Refunds & Reversals & Payouts
  | "REFUND_AMOUNT_EXCEEDS_PAYMENT"
  | "REFUND_NOT_ELIGIBLE"
  | "REVERSAL_ALREADY_EXISTS"
  | "PAYOUT_INSUFFICIENT_FUNDS"
  | "UNAUTHORIZED_FINANCIAL_OPERATION";

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}
