import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPayout } from "../api/payouts-api";
import type { PayoutResponse } from "@/types/payout";
import type { ApiError } from "@/lib/api/client";

export const PAYOUT_DETAIL_QUERY_KEY = "payouts/detail";

export interface UsePayoutOptions {
  enablePolling?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export function usePayout(
  payoutId: string | undefined,
  options?: UsePayoutOptions
) {
  const queryClient = useQueryClient();
  const pollAttemptRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isPollingExhausted, setIsPollingExhausted] = useState(false);

  const pollIntervalMs = options?.pollIntervalMs ?? 3000;
  const maxPollAttempts = options?.maxPollAttempts ?? 10;

  const query = useQuery<PayoutResponse, ApiError>({
    queryKey: [PAYOUT_DETAIL_QUERY_KEY, payoutId],
    queryFn: ({ signal }) => getPayout(payoutId!, signal),
    enabled: Boolean(payoutId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });

  const status = query.data?.status;
  const isTerminal = status === "SETTLED" || status === "FAILED";

  useEffect(() => {
    pollAttemptRef.current = 0;
    setIsPollingExhausted(false);
  }, [payoutId]);

  useEffect(() => {
    if (!options?.enablePolling || !payoutId || !status) {
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
          const updated = await getPayout(
            payoutId,
            abortControllerRef.current.signal
          );

          if (!isCancelled) {
            queryClient.setQueryData([PAYOUT_DETAIL_QUERY_KEY, payoutId], updated);

            if (updated.status === "SETTLED" || updated.status === "FAILED") {
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
  }, [options?.enablePolling, payoutId, status, isTerminal, pollIntervalMs, maxPollAttempts, queryClient]);

  const checkStatusManually = useCallback(async () => {
    if (!payoutId) return;
    const manualController = new AbortController();
    try {
      const updated = await getPayout(payoutId, manualController.signal);
      queryClient.setQueryData([PAYOUT_DETAIL_QUERY_KEY, payoutId], updated);
      if (updated.status === "SETTLED" || updated.status === "FAILED") {
        setIsPollingExhausted(false);
      }
    } catch {
      await query.refetch();
    }
  }, [payoutId, queryClient, query]);

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
