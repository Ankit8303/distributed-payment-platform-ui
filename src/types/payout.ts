import { z } from "zod";

/**
 * Backend Payout status enum values.
 */
export type BackendPayoutStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "PENDING_RECONCILIATION";

/**
 * Semantic frontend presentation statuses for payouts.
 */
export type PayoutUIStatus =
  | "SETTLED"
  | "PENDING_RECONCILIATION"
  | "PROCESSING"
  | "FAILED"
  | "UNKNOWN";

export interface PayoutStatusInfo {
  uiStatus: PayoutUIStatus;
  label: string;
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  isTerminal: boolean;
  description: string;
}

/**
 * Safely maps any backend payout status string into an authoritative UI status.
 */
export function mapPayoutStatus(rawStatus: string | null | undefined): PayoutStatusInfo {
  if (!rawStatus) {
    return {
      uiStatus: "UNKNOWN",
      label: "Status Unknown",
      variant: "neutral",
      isTerminal: false,
      description: "Payout status cannot be verified. Authoritative confirmation pending.",
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
        description: "Payout disbursed to destination and debited from ledger account.",
      };
    case "PENDING_RECONCILIATION":
      return {
        uiStatus: "PENDING_RECONCILIATION",
        label: "Reconciliation In Progress",
        variant: "warning",
        isTerminal: false,
        description:
          "Payout processing with external banking provider. Reconciling with financial network. Do not resubmit.",
      };
    case "REQUESTED":
    case "PROCESSING":
      return {
        uiStatus: "PROCESSING",
        label: normalized === "REQUESTED" ? "Requested" : "Processing",
        variant: "info",
        isTerminal: false,
        description: "Payout request received and queued for external execution.",
      };
    case "FAILED":
      return {
        uiStatus: "FAILED",
        label: "Failed",
        variant: "danger",
        isTerminal: true,
        description: "Payout failed. Account funds were not disbursed.",
      };
    default:
      return {
        uiStatus: "UNKNOWN",
        label: "Unrecognized Status",
        variant: "neutral",
        isTerminal: false,
        description: `Unrecognized payout status: "${rawStatus}". Authoritative confirmation pending.`,
      };
  }
}

/**
 * Zod validation schema for payout creation request.
 * Note: Payout does not contain fee parameters.
 */
export const payoutCreateSchema = z.object({
  accountId: z
    .string({
      required_error: "Origin account ID is required",
    })
    .uuid("Invalid account ID format: must be UUID"),
  amountMinor: z
    .number({
      required_error: "Payout amount is required",
      invalid_type_error: "Payout amount must be a number",
    })
    .int("Payout amount must be an integer minor unit (cents)")
    .positive("Payout amount must be strictly positive"),
  currency: z
    .string({
      required_error: "Currency is required",
    })
    .length(3, "Currency must be a 3-letter ISO code")
    .toUpperCase(),
});

export type PayoutCreateRequest = z.infer<typeof payoutCreateSchema>;

/**
 * Authoritative response returned by GET /api/v1/payouts/{payoutId}
 * and POST /api/v1/payouts.
 */
export interface PayoutResponse {
  payoutId: string;
  accountId: string;
  amountMinor: number;
  currency: string;
  status: BackendPayoutStatus | string;
  providerReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
}
