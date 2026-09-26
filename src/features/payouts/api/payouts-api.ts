import { apiFetch, generateCorrelationId } from "@/lib/api/client";
import {
  type PayoutCreateRequest,
  type PayoutResponse,
  payoutCreateSchema,
} from "@/types/payout";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Submits a new payout creation request to the frozen backend.
 *
 * Requirements:
 * - Requires origin accountId (UUID), amountMinor (positive int), currency (ISO 3-char).
 * - Sends mandatory `Idempotency-Key` header bound to this exact attempt.
 * - Does not send or expect fee parameters.
 * - Dispatches to POST /api/v1/payouts.
 */
export async function createPayout(
  request: PayoutCreateRequest,
  idempotencyKey: string,
  correlationId?: string
): Promise<PayoutResponse> {
  const trimmedKey = idempotencyKey?.trim();
  if (!trimmedKey || !UUID_REGEX.test(trimmedKey)) {
    throw new Error("Invalid idempotency key format: must be RFC 4122 v4 UUID");
  }

  const parseResult = payoutCreateSchema.safeParse(request);
  if (!parseResult.success) {
    throw new Error(parseResult.error.errors[0]?.message || "Invalid payout request payload");
  }

  const resolvedCorrelationId = correlationId || generateCorrelationId();

  return apiFetch<PayoutResponse>("/api/v1/payouts", {
    method: "POST",
    idempotencyKey: trimmedKey,
    correlationId: resolvedCorrelationId,
    body: JSON.stringify(parseResult.data),
  });
}

/**
 * Retrieves the authoritative payout record by ID from the frozen backend.
 */
export async function getPayout(
  payoutId: string,
  signal?: AbortSignal
): Promise<PayoutResponse> {
  const trimmedId = payoutId?.trim();
  if (!trimmedId) {
    throw new Error("Payout ID is required");
  }

  return apiFetch<PayoutResponse>(`/api/v1/payouts/${encodeURIComponent(trimmedId)}`, {
    method: "GET",
    signal,
  });
}
