import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPayment } from "../api/payments-api";
import type { PaymentResponse } from "@/types/payment";
import type { ApiError } from "@/lib/api/client";

export const PAYMENT_DETAIL_QUERY_KEY = "payments/detail";

export interface UsePaymentOptions {
  enablePolling?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export function usePayment(
  paymentId: string | undefined,
  options?: UsePaymentOptions
) {
  const queryClient = useQueryClient();
  const pollAttemptRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isPollingExhausted, setIsPollingExhausted] = useState(false);

  const pollIntervalMs = options?.pollIntervalMs ?? 3000;
  const maxPollAttempts = options?.maxPollAttempts ?? 10;

  const query = useQuery<PaymentResponse, ApiError>({
    queryKey: [PAYMENT_DETAIL_QUERY_KEY, paymentId],
    queryFn: ({ signal }) => getPayment(paymentId!, signal),
    enabled: Boolean(paymentId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });

  const status = query.data?.status;
  const isTerminal =
    status === "SETTLED" ||
    status === "DECLINED" ||
    status === "FAILED" ||
    status === "EXPIRED";

  // Reset coordinator if target paymentId changes
  useEffect(() => {
    pollAttemptRef.current = 0;
    setIsPollingExhausted(false);
  }, [paymentId]);

  // Polling Coordinator State Machine with active AbortController wiring
  useEffect(() => {
    // Stop condition 1: Polling disabled, unmounted, or no status yet
    if (!options?.enablePolling || !paymentId || !status) {
      return;
    }

    // Stop condition 2: Terminal status reached
    if (isTerminal) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    // Active polling condition: PENDING_RECONCILIATION
    if (status !== "PENDING_RECONCILIATION") {
      return;
    }

    let isCancelled = false;

    const scheduleNextPoll = () => {
      if (isCancelled || pollAttemptRef.current >= maxPollAttempts) {
        if (pollAttemptRef.current >= maxPollAttempts) {
          setIsPollingExhausted(true);
        }
        return;
      }

      timerRef.current = setTimeout(async () => {
        if (isCancelled) return;
        pollAttemptRef.current += 1;
        abortControllerRef.current = new AbortController();

        try {
          const freshData = await getPayment(paymentId, abortControllerRef.current.signal);
          if (isCancelled) return;

          queryClient.setQueryData([PAYMENT_DETAIL_QUERY_KEY, paymentId], freshData);

          const nextStatus = freshData.status;
          const isNextTerminal =
            nextStatus === "SETTLED" ||
            nextStatus === "DECLINED" ||
            nextStatus === "FAILED" ||
            nextStatus === "EXPIRED";

          if (!isNextTerminal && nextStatus === "PENDING_RECONCILIATION") {
            scheduleNextPoll();
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
          queryClient.invalidateQueries({ queryKey: [PAYMENT_DETAIL_QUERY_KEY, paymentId] });
        }
      }, pollIntervalMs);
    };

    scheduleNextPoll();

    // Stop conditions 4 & 5: Cleanup on unmount, route navigation, or dependency change
    return () => {
      isCancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [
    status,
    isTerminal,
    paymentId,
    options?.enablePolling,
    pollIntervalMs,
    maxPollAttempts,
    queryClient,
  ]);

  const checkStatusManually = useCallback(async () => {
    return query.refetch();
  }, [query]);

  return {
    ...query,
    isPollingActive:
      Boolean(options?.enablePolling) &&
      status === "PENDING_RECONCILIATION" &&
      !isPollingExhausted &&
      !isTerminal,
    isPollingExhausted,
    pollAttemptCount: pollAttemptRef.current,
    checkStatusManually,
  };
}
