import { useMutation } from "@tanstack/react-query";
import { createReversal } from "../api/refunds-api";
import type { ReversalCreateRequest, ReversalResponse } from "@/types/reversal";
import type { ApiError } from "@/lib/api/client";

export interface CreateReversalMutationVariables {
  paymentId: string;
  request: ReversalCreateRequest;
  idempotencyKey: string;
  correlationId?: string;
}

/**
 * Mutation hook for reversal creation.
 *
 * Invariant:
 * Financial mutations MUST NOT automatically retry on failure (`retry: false`).
 */
export function useCreateReversal() {
  return useMutation<ReversalResponse, ApiError, CreateReversalMutationVariables>({
    mutationFn: ({ paymentId, request, idempotencyKey, correlationId }) =>
      createReversal(paymentId, request, idempotencyKey, correlationId),
    retry: false,
  });
}
