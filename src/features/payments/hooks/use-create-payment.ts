import { useMutation } from "@tanstack/react-query";
import { createPayment } from "../api/payments-api";
import type { PaymentCreateRequest, PaymentResponse } from "@/types/payment";
import type { ApiError } from "@/lib/api/client";

export interface CreatePaymentMutationVariables {
  request: PaymentCreateRequest;
  idempotencyKey: string;
  correlationId?: string;
}

/**
 * Mutation hook for payment creation.
 *
 * Invariant:
 * Financial mutations MUST NOT automatically retry on failure (`retry: false`).
 * Automatic retries could duplicate transactions or cause unexpected conflicts.
 */
export function useCreatePayment() {
  return useMutation<PaymentResponse, ApiError, CreatePaymentMutationVariables>({
    mutationFn: ({ request, idempotencyKey, correlationId }) =>
      createPayment(request, idempotencyKey, correlationId),
    retry: false,
  });
}
