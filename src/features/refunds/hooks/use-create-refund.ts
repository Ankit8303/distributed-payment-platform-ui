import { useMutation } from "@tanstack/react-query";
import { createRefund } from "../api/refunds-api";
import type { RefundCreateRequest, RefundResponse } from "@/types/refund";
import type { ApiError } from "@/lib/api/client";

export interface CreateRefundMutationVariables {
  paymentId: string;
  request: RefundCreateRequest;
  idempotencyKey: string;
  correlationId?: string;
}

/**
 * Mutation hook for refund creation.
 *
 * Invariant:
 * Financial mutations MUST NOT automatically retry on failure (`retry: false`).
 */
export function useCreateRefund() {
  return useMutation<RefundResponse, ApiError, CreateRefundMutationVariables>({
    mutationFn: ({ paymentId, request, idempotencyKey, correlationId }) =>
      createRefund(paymentId, request, idempotencyKey, correlationId),
    retry: false,
  });
}
