import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRefund } from "../api/refunds-api";
import type { RefundResponse } from "@/types/refund";
import type { ApiError } from "@/lib/api/client";

export const REFUND_DETAIL_QUERY_KEY = "refunds/detail";

export interface UseRefundOptions {
  enablePolling?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export function useRefund(
  refundId: string | undefined,
  options?: UseRefundOptions
) {
  const queryClient = useQueryClient();
  const pollAttemptRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isPollingExhausted, setIsPollingExhausted] = useState(false);

  const pollIntervalMs = options?.pollIntervalMs ?? 3000;
  const maxPollAttempts = options?.maxPollAttempts ?? 10;

  const query = useQuery<RefundResponse, ApiError>({
    queryKey: [REFUND_DETAIL_QUERY_KEY, refundId],
    queryFn: ({ signal }) => getRefund(refundId!, signal),
    enabled: Boolean(refundId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });

  const status = query.data?.status;
  const isTerminal = status === "SETTLED" || status === "FAILED";

  // Reset coordinator if target refundId changes
  useEffect(() => {
    pollAttemptRef.current = 0;
    setIsPollingExhausted(false);
  }, [refundId]);

  // Polling Coordinator State Machine with active AbortController wiring
  useEffect(() => {
    if (!options?.enablePolling || !refundId || !status) {
      return;
    }

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

    if (status !== "PENDING_RECONCILIATION" && status !== "REQUESTED" && status !== "PROCESSING") {
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

        abortControllerRef.current = new AbortController();
        pollAttemptRef.current += 1;

        try {
          const updated = await getRefund(
            refundId,
            abortControllerRef.current.signal
          );

          if (!isCancelled) {
            queryClient.setQueryData([REFUND_DETAIL_QUERY_KEY, refundId], updated);

            if (updated.status === "SETTLED" || updated.status === "FAILED") {
              // Terminal state reached
              return;
            }

            if (pollAttemptRef.current < maxPollAttempts) {
              scheduleNextPoll();
            } else {
              setIsPollingExhausted(true);
            }
          }
        } catch {
          if (!isCancelled && pollAttemptRef.current < maxPollAttempts) {
            scheduleNextPoll();
          } else if (!isCancelled) {
            setIsPollingExhausted(true);
          }
        }
      }, pollIntervalMs);
    };

    scheduleNextPoll();

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
  }, [options?.enablePolling, refundId, status, isTerminal, pollIntervalMs, maxPollAttempts, queryClient]);

  const checkStatusManually = useCallback(async () => {
    if (!refundId) return;
    const manualController = new AbortController();
    try {
      const updated = await getRefund(refundId, manualController.signal);
      queryClient.setQueryData([REFUND_DETAIL_QUERY_KEY, refundId], updated);
      if (updated.status === "SETTLED" || updated.status === "FAILED") {
        setIsPollingExhausted(false);
      }
    } catch {
      await query.refetch();
    }
  }, [refundId, queryClient, query]);

  const isPollingActive =
    Boolean(options?.enablePolling) &&
    !isTerminal &&
    !isPollingExhausted &&
    Boolean(status && (status === "PENDING_RECONCILIATION" || status === "REQUESTED" || status === "PROCESSING"));

  return {
    ...query,
    isPollingActive,
    isPollingExhausted,
    pollAttemptCount: pollAttemptRef.current,
    checkStatusManually,
  };
}
