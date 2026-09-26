import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReversal } from "../api/refunds-api";
import type { ReversalResponse } from "@/types/reversal";
import type { ApiError } from "@/lib/api/client";

export const REVERSAL_DETAIL_QUERY_KEY = "reversals/detail";

export interface UseReversalOptions {
  enablePolling?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export function useReversal(
  reversalId: string | undefined,
  options?: UseReversalOptions
) {
  const queryClient = useQueryClient();
  const pollAttemptRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isPollingExhausted, setIsPollingExhausted] = useState(false);

  const pollIntervalMs = options?.pollIntervalMs ?? 3000;
  const maxPollAttempts = options?.maxPollAttempts ?? 10;

  const query = useQuery<ReversalResponse, ApiError>({
    queryKey: [REVERSAL_DETAIL_QUERY_KEY, reversalId],
    queryFn: ({ signal }) => getReversal(reversalId!, signal),
    enabled: Boolean(reversalId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });

  const status = query.data?.status;
  const isTerminal = status === "COMPLETED" || status === "FAILED";

  useEffect(() => {
    pollAttemptRef.current = 0;
    setIsPollingExhausted(false);
  }, [reversalId]);

  useEffect(() => {
    if (!options?.enablePolling || !reversalId || !status) {
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

        abortControllerRef.current = new AbortController();
        pollAttemptRef.current += 1;

        try {
          const updated = await getReversal(
            reversalId,
            abortControllerRef.current.signal
          );

          if (!isCancelled) {
            queryClient.setQueryData([REVERSAL_DETAIL_QUERY_KEY, reversalId], updated);

            if (updated.status === "COMPLETED" || updated.status === "FAILED") {
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
  }, [options?.enablePolling, reversalId, status, isTerminal, pollIntervalMs, maxPollAttempts, queryClient]);

  const checkStatusManually = useCallback(async () => {
    if (!reversalId) return;
    const manualController = new AbortController();
    try {
      const updated = await getReversal(reversalId, manualController.signal);
      queryClient.setQueryData([REVERSAL_DETAIL_QUERY_KEY, reversalId], updated);
      if (updated.status === "COMPLETED" || updated.status === "FAILED") {
        setIsPollingExhausted(false);
      }
    } catch {
      await query.refetch();
    }
  }, [reversalId, queryClient, query]);

  const isPollingActive =
    Boolean(options?.enablePolling) &&
    !isTerminal &&
    !isPollingExhausted &&
    Boolean(status && status === "PENDING_RECONCILIATION");

  return {
    ...query,
    isPollingActive,
    isPollingExhausted,
    pollAttemptCount: pollAttemptRef.current,
    checkStatusManually,
  };
}
