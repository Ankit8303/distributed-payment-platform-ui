import { z } from "zod";

/**
 * All 9 raw backend PaymentStatus enum values.
 */
export type BackendPaymentStatus =
  | "CREATED"
  | "AUTHORIZING"
  | "AUTHORIZED"
  | "CAPTURING"
  | "SETTLED"
  | "DECLINED"
  | "FAILED"
  | "EXPIRED"
  | "PENDING_RECONCILIATION";

/**
 * Semantic frontend presentation statuses.
 */
export type PaymentUIStatus =
  | "SETTLED"
  | "PENDING_RECONCILIATION"
  | "DECLINED"
  | "FAILED"
  | "EXPIRED"
  | "PROCESSING"
  | "UNKNOWN";

export interface PaymentStatusInfo {
  uiStatus: PaymentUIStatus;
  label: string;
  variant: "success" | "warning" | "danger" | "neutral" | "info";
  isTerminal: boolean;
  description: string;
}

/**
 * Safely maps any backend status string into an authoritative UI status.
 * Unknown statuses fail safe to UNKNOWN rather than silently assuming success/failure.
 */
export function mapPaymentStatus(rawStatus: string | null | undefined): PaymentStatusInfo {
  if (!rawStatus) {
    return {
      uiStatus: "UNKNOWN",
      label: "Status Unknown",
      variant: "neutral",
      isTerminal: false,
      description: "Payment status cannot be verified. Authoritative confirmation pending.",
    };
  }

  const normalized = rawStatus.trim().toUpperCase();

  switch (normalized) {
    case "SETTLED":
      return {
        uiStatus: "SETTLED",
        label: "Settled",
        variant: "success",
        isTerminal: true,
        description: "Payment successfully processed and settled.",
      };
    case "PENDING_RECONCILIATION":
      return {
        uiStatus: "PENDING_RECONCILIATION",
        label: "Reconciliation In Progress",
        variant: "warning",
        isTerminal: false,
        description: "Payment processing. Reconciling with financial network. Do not resubmit.",
      };
    case "DECLINED":
      return {
        uiStatus: "DECLINED",
        label: "Declined",
        variant: "danger",
        isTerminal: true,
        description: "Payment was declined by the payment provider.",
      };
    case "FAILED":
      return {
        uiStatus: "FAILED",
        label: "Failed",
        variant: "danger",
        isTerminal: true,
        description: "Payment processing failed. Funds were not captured.",
      };
    case "EXPIRED":
      return {
        uiStatus: "EXPIRED",
        label: "Expired",
        variant: "neutral",
        isTerminal: true,
        description: "Payment authorization expired.",
      };
    case "CREATED":
    case "AUTHORIZING":
    case "AUTHORIZED":
    case "CAPTURING":
      return {
        uiStatus: "PROCESSING",
        label: "Processing",
        variant: "info",
        isTerminal: false,
        description: "Payment is currently processing. Please wait.",
      };
    default:
      return {
        uiStatus: "UNKNOWN",
        label: "Status Unknown",
        variant: "neutral",
        isTerminal: false,
        description: "Payment status cannot be verified. Authoritative confirmation pending.",
      };
  }
}

/**
 * Payload sent to POST /api/v1/payments.
 * Note: payerAccountId is NOT present; backend resolves it from the authenticated session.
 */
export interface PaymentCreateRequest {
  payeeAccountId: string;
  amountMinor: number;
  currency: string;
  paymentMethodToken: string;
}

/**
 * Authoritative response from POST /api/v1/payments and GET /api/v1/payments/{id}.
 */
export interface PaymentResponse {
  paymentId: string;
  idempotencyKey: string;
  payerAccountId: string;
  payeeAccountId: string;
  amountMinor: number;
  feeAmountMinor: number;
  currency: string;
  status: string;
  providerReference?: string;
  correlationId?: string;
  createdAt: string;
  message?: string;
  pollUrl?: string;
}

/**
 * Client form draft state before submission confirmation.
 */
export interface PaymentFormValues {
  payeeAccountId: string;
  amountDecimal: string;
  currency: string;
  paymentMethodToken: string;
}

/**
 * Immutable snapshot created when user reviews and confirms payment.
 */
export interface FrozenPaymentPayload {
  readonly payeeAccountId: string;
  readonly amountMinor: number;
  readonly amountDecimal: string;
  readonly currency: string;
  readonly paymentMethodToken: string;
  readonly idempotencyKey: string;
}

/**
 * Zod validation schema for pre-submission checks.
 */
export const paymentFormSchema = z.object({
  payeeAccountId: z
    .string()
    .trim()
    .min(1, "Payee account ID is required")
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      "Must be a valid UUID"
    ),
  amountDecimal: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format. Use e.g. 10.50"),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Currency must be exactly 3 uppercase letters (e.g. USD)"),
  paymentMethodToken: z
    .string()
    .trim()
    .min(1, "Payment method is required"),
});

/**
 * Zod validation schema for backend PaymentCreateRequest payload.
 */
export const paymentCreateSchema = z.object({
  payeeAccountId: z
    .string()
    .trim()
    .min(1, "Payee account ID is required")
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      "Must be a valid UUID"
    ),
  amountMinor: z
    .number()
    .int("Amount minor must be an integer")
    .positive("Amount must be greater than zero")
    .max(Number.MAX_SAFE_INTEGER, "Amount exceeds maximum representable limit"),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Currency must be exactly 3 uppercase letters (e.g. USD)"),
  paymentMethodToken: z
    .string()
    .trim()
    .min(1, "Payment method token is required"),
});

