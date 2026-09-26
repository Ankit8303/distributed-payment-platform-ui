import { apiFetch, generateCorrelationId } from "@/lib/api/client";
import {
  type RefundCreateRequest,
  type RefundResponse,
  refundCreateSchema,
} from "@/types/refund";
import {
  type ReversalCreateRequest,
  type ReversalResponse,
  reversalCreateSchema,
} from "@/types/reversal";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Submits a new refund request for a settled payment.
 *
 * Requirements:
 * - Requires a valid UUIDv4 Idempotency-Key.
 * - Enforces positive amountMinor and optional reason max 500 chars.
 * - Dispatches to POST /api/v1/payments/{paymentId}/refunds.
 */
export async function createRefund(
  paymentId: string,
  request: RefundCreateRequest,
  idempotencyKey: string,
  correlationId?: string
): Promise<RefundResponse> {
  const trimmedPaymentId = paymentId?.trim();
  if (!trimmedPaymentId) {
    throw new Error("Payment ID is required to initiate a refund");
  }

  const trimmedKey = idempotencyKey?.trim();
  if (!trimmedKey || !UUID_REGEX.test(trimmedKey)) {
    throw new Error("Invalid idempotency key format: must be RFC 4122 v4 UUID");
  }

  const parseResult = refundCreateSchema.safeParse(request);
  if (!parseResult.success) {
    throw new Error(parseResult.error.errors[0]?.message || "Invalid refund request payload");
  }

  const resolvedCorrelationId = correlationId || generateCorrelationId();

  return apiFetch<RefundResponse>(
    `/api/v1/payments/${encodeURIComponent(trimmedPaymentId)}/refunds`,
    {
      method: "POST",
      idempotencyKey: trimmedKey,
      correlationId: resolvedCorrelationId,
      body: JSON.stringify(parseResult.data),
    }
  );
}

/**
 * Retrieves the authoritative refund record by ID from the frozen backend.
 */
export async function getRefund(
  refundId: string,
  signal?: AbortSignal
): Promise<RefundResponse> {
  const trimmedId = refundId?.trim();
  if (!trimmedId) {
    throw new Error("Refund ID is required");
  }

  return apiFetch<RefundResponse>(`/api/v1/refunds/${encodeURIComponent(trimmedId)}`, {
    method: "GET",
    signal,
  });
}

/**
 * Submits a full reversal request for a settled payment with no prior refunds.
 *
 * Requirements:
 * - Full original payment amount is reversed; no partial amount accepted.
 * - Mandatory reason string (max 500 chars).
 * - Dispatches to POST /api/v1/payments/{paymentId}/reversal.
 */
export async function createReversal(
  paymentId: string,
  request: ReversalCreateRequest,
  idempotencyKey: string,
  correlationId?: string
): Promise<ReversalResponse> {
  const trimmedPaymentId = paymentId?.trim();
  if (!trimmedPaymentId) {
    throw new Error("Payment ID is required to reverse payment");
  }

  const trimmedKey = idempotencyKey?.trim();
  if (!trimmedKey || !UUID_REGEX.test(trimmedKey)) {
    throw new Error("Invalid idempotency key format: must be RFC 4122 v4 UUID");
  }

  const parseResult = reversalCreateSchema.safeParse(request);
  if (!parseResult.success) {
    throw new Error(parseResult.error.errors[0]?.message || "Invalid reversal request payload");
  }

  const resolvedCorrelationId = correlationId || generateCorrelationId();

  return apiFetch<ReversalResponse>(
    `/api/v1/payments/${encodeURIComponent(trimmedPaymentId)}/reversal`,
    {
      method: "POST",
      idempotencyKey: trimmedKey,
      correlationId: resolvedCorrelationId,
      body: JSON.stringify(parseResult.data),
    }
  );
}

/**
 * Retrieves the authoritative reversal record by ID from the frozen backend.
 */
export async function getReversal(
  reversalId: string,
  signal?: AbortSignal
): Promise<ReversalResponse> {
  const trimmedId = reversalId?.trim();
  if (!trimmedId) {
    throw new Error("Reversal ID is required");
  }

  return apiFetch<ReversalResponse>(`/api/v1/reversals/${encodeURIComponent(trimmedId)}`, {
    method: "GET",
    signal,
  });
}
