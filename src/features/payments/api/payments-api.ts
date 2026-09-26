import { apiFetch, generateCorrelationId } from "@/lib/api/client";
import {
  type PaymentCreateRequest,
  type PaymentResponse,
  paymentCreateSchema,
} from "@/types/payment";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Submits a new payment creation request to the frozen backend.
 *
 * Requirements:
 * - Validates schema and UUID idempotency key before dispatch.
 * - Sends mandatory `Idempotency-Key` header bound to this exact attempt.
 * - Sends optional `X-Correlation-ID` header.
 * - Reuses in-memory Bearer token via `apiFetch`.
 */
export async function createPayment(
  request: PaymentCreateRequest,
  idempotencyKey: string,
  correlationId?: string
): Promise<PaymentResponse> {
  const trimmedKey = idempotencyKey?.trim();
  if (!trimmedKey || !UUID_REGEX.test(trimmedKey)) {
    throw new Error("Invalid idempotency key format: must be RFC 4122 v4 UUID");
  }

  const parseResult = paymentCreateSchema.safeParse(request);
  if (!parseResult.success) {
    throw new Error(parseResult.error.errors[0]?.message || "Invalid payment request payload");
  }

  const resolvedCorrelationId = correlationId || generateCorrelationId();

  return apiFetch<PaymentResponse>("/api/v1/payments", {
    method: "POST",
    idempotencyKey: trimmedKey,
    correlationId: resolvedCorrelationId,
    body: JSON.stringify(parseResult.data),
  });
}

/**
 * Retrieves the authoritative payment record by ID from the frozen backend.
 *
 * Supports `AbortSignal` for cancellation during polling, navigation, or component unmount.
 */
export async function getPayment(
  paymentId: string,
  signal?: AbortSignal
): Promise<PaymentResponse> {
  const trimmedId = paymentId?.trim();
  if (!trimmedId) {
    throw new Error("Payment ID is required");
  }

  return apiFetch<PaymentResponse>(`/api/v1/payments/${encodeURIComponent(trimmedId)}`, {
    method: "GET",
    signal,
  });
}
