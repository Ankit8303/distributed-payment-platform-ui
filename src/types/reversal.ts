import { z } from "zod";

/**
 * Backend Reversal status enum values.
 */
export type BackendReversalStatus =
  | "COMPLETED"
  | "FAILED"
  | "PENDING_RECONCILIATION";

/**
 * Semantic frontend presentation statuses for reversals.
 */
export type ReversalUIStatus =
  | "COMPLETED"
  | "PENDING_RECONCILIATION"
  | "FAILED"
  | "UNKNOWN";

export interface ReversalStatusInfo {
  uiStatus: ReversalUIStatus;
  label: string;
  variant: "success" | "warning" | "danger" | "neutral";
  isTerminal: boolean;
  description: string;
}

/**
 * Safely maps any backend reversal status string into an authoritative UI status.
 */
export function mapReversalStatus(rawStatus: string | null | undefined): ReversalStatusInfo {
  if (!rawStatus) {
    return {
      uiStatus: "UNKNOWN",
      label: "Status Unknown",
      variant: "neutral",
      isTerminal: false,
      description: "Reversal status cannot be verified. Authoritative confirmation pending.",
    };
  }

  const normalized = rawStatus.trim().toUpperCase();

  switch (normalized) {
    case "COMPLETED":
      return {
        uiStatus: "COMPLETED",
        label: "Completed",
        variant: "success",
        isTerminal: true,
        description: "Payment has been completely reversed and compensating ledger entry posted.",
      };
    case "PENDING_RECONCILIATION":
      return {
        uiStatus: "PENDING_RECONCILIATION",
        label: "Reconciliation In Progress",
        variant: "warning",
        isTerminal: false,
        description:
          "Reversal is reconciling with financial network. Compensating entries pending reconciliation.",
      };
    case "FAILED":
      return {
        uiStatus: "FAILED",
        label: "Failed",
        variant: "danger",
        isTerminal: true,
        description: "Payment reversal failed. The original transaction stands.",
      };
    default:
      return {
        uiStatus: "UNKNOWN",
        label: "Unrecognized Status",
        variant: "neutral",
        isTerminal: false,
        description: `Unrecognized reversal status: "${rawStatus}". Authoritative confirmation pending.`,
      };
  }
}

/**
 * Zod validation schema for reversal creation request.
 * Note: Reversal is strictly full payment reversal; no amount input exists.
 * Reason is strictly mandatory (min 1, max 500).
 */
export const reversalCreateSchema = z.object({
  reason: z
    .string({
      required_error: "Reversal reason is mandatory",
    })
    .trim()
    .min(1, "A reason must be provided to reverse this payment")
    .max(500, "Reason must not exceed 500 characters"),
});

export type ReversalCreateRequest = z.infer<typeof reversalCreateSchema>;

/**
 * Authoritative response returned by GET /api/v1/reversals/{reversalId}
 * and POST /api/v1/payments/{paymentId}/reversal.
 */
export interface ReversalResponse {
  reversalId: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  status: BackendReversalStatus | string;
  reason: string;
  compensatingLedgerTransactionId?: string | null;
  failureReason?: string | null;
  createdAt: string;
}
