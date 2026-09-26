import { z } from "zod";

/**
 * Backend Refund status enum values.
 */
export type BackendRefundStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "PENDING_RECONCILIATION";

/**
 * Semantic frontend presentation statuses for refunds.
 */
export type RefundUIStatus =
  | "SETTLED"
  | "PENDING_RECONCILIATION"
  | "PROCESSING"
  | "FAILED"
  | "UNKNOWN";

export interface RefundStatusInfo {
  uiStatus: RefundUIStatus;
  label: string;
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  isTerminal: boolean;
  description: string;
}

/**
 * Safely maps any backend refund status string into an authoritative UI status.
 * Unknown statuses fail safe to UNKNOWN rather than assuming success or failure.
 */
export function mapRefundStatus(rawStatus: string | null | undefined): RefundStatusInfo {
  if (!rawStatus) {
    return {
      uiStatus: "UNKNOWN",
      label: "Status Unknown",
      variant: "neutral",
      isTerminal: false,
      description: "Refund status cannot be verified. Authoritative confirmation pending.",
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
        description: "Refund successfully settled on the ledger.",
      };
    case "PENDING_RECONCILIATION":
      return {
        uiStatus: "PENDING_RECONCILIATION",
        label: "Reconciliation In Progress",
        variant: "warning",
        isTerminal: false,
        description:
          "Refund processing with external payment gateway. Reconciling with financial network. Do not resubmit.",
      };
    case "REQUESTED":
    case "PROCESSING":
      return {
        uiStatus: "PROCESSING",
        label: normalized === "REQUESTED" ? "Requested" : "Processing",
        variant: "info",
        isTerminal: false,
        description: "Refund is being processed by the payment provider.",
      };
    case "FAILED":
      return {
        uiStatus: "FAILED",
        label: "Failed",
        variant: "danger",
        isTerminal: true,
        description: "Refund could not be processed. Funds were not reversed.",
      };
    default:
      return {
        uiStatus: "UNKNOWN",
        label: "Unrecognized Status",
        variant: "neutral",
        isTerminal: false,
        description: `Unrecognized refund status: "${rawStatus}". Authoritative confirmation pending.`,
      };
  }
}

/**
 * Zod validation schema for refund creation request.
 */
export const refundCreateSchema = z.object({
  amountMinor: z
    .number({
      required_error: "Refund amount is required",
      invalid_type_error: "Refund amount must be a number",
    })
    .int("Refund amount must be an integer minor unit (cents)")
    .positive("Refund amount must be strictly positive"),
  reason: z
    .string()
    .trim()
    .max(500, "Reason must not exceed 500 characters")
    .optional()
    .or(z.literal("")),
});

export type RefundCreateRequest = z.infer<typeof refundCreateSchema>;

/**
 * Authoritative response returned by GET /api/v1/refunds/{refundId}
 * and POST /api/v1/payments/{paymentId}/refunds.
 */
export interface RefundResponse {
  refundId: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  status: BackendRefundStatus | string;
  reason?: string | null;
  providerReference?: string | null;
  compensatingLedgerTransactionId?: string | null;
  failureReason?: string | null;
  createdAt: string;
}
