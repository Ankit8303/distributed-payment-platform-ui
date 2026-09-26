import { useMutation } from "@tanstack/react-query";
import { createPayout } from "../api/payouts-api";
import type { PayoutCreateRequest, PayoutResponse } from "@/types/payout";
import type { ApiError } from "@/lib/api/client";

export interface CreatePayoutMutationVariables {
  request: PayoutCreateRequest;
  idempotencyKey: string;
  correlationId?: string;
}

/**
 * Mutation hook for payout creation.
 *
 * Invariant:
 * Financial mutations MUST NOT automatically retry on failure (`retry: false`).
 */
export function useCreatePayout() {
  return useMutation<PayoutResponse, ApiError, CreatePayoutMutationVariables>({
    mutationFn: ({ request, idempotencyKey, correlationId }) =>
      createPayout(request, idempotencyKey, correlationId),
    retry: false,
  });
}
