/**
 * Financial Domain Types
 * Invariant: The frontend never performs authoritative financial calculations.
 * Monetary amounts are represented strictly as integer minor units (e.g. cents) with explicit ISO 4217 currency.
 */

export type MinorUnitAmount = number; // Integer minor units (e.g., 5000 for $50.00 USD)

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | string;

export interface Money {
  amountMinor: MinorUnitAmount;
  currency: CurrencyCode;
}

export type PaymentStatus =
  | "CREATED"
  | "AUTHORIZING"
  | "AUTHORIZED"
  | "CAPTURING"
  | "SETTLED"
  | "PENDING_RECONCILIATION"
  | "DECLINED"
  | "FAILED";

export type AccountStatus = "ACTIVE" | "FROZEN" | "SUSPENDED" | "CLOSED";

export type AccountType = "CUSTOMER" | "MERCHANT" | "INTERNAL" | "SYSTEM";

export type UserRole = "CUSTOMER" | "MERCHANT" | "ADMIN" | "SYSTEM";

export type RefundStatus = "PENDING" | "SETTLED" | "FAILED";

export type PayoutStatus = "PENDING" | "PROCESSING" | "SETTLED" | "FAILED";

export type ReconciliationCaseStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
