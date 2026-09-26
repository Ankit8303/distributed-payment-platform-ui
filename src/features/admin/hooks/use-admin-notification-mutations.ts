"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import {
  retryAdminNotification,
  runAdminNotificationWorker,
} from "@/lib/api/endpoints/admin-api";
import type {
  NotificationAdminResponse,
  NotificationWorkerParams,
} from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseRetryAdminNotificationOptions {
  onSuccess?: (data: NotificationAdminResponse) => void;
  onError?: (error: ApiError | Error) => void;
}

export function useRetryAdminNotification(
  notificationId: string,
  options?: UseRetryAdminNotificationOptions
) {
  const queryClient = useQueryClient();

  return useMutation<NotificationAdminResponse, ApiError | Error, void>({
    mutationFn: () => retryAdminNotification(notificationId),
    retry: false, // Strict: Never silently retry operational mutations
    onSuccess: (data) => {
      // Invalidate specific notification and directory
      queryClient.invalidateQueries({
        queryKey: adminKeys.notification(notificationId),
      });
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, "notifications"],
      });
      options?.onSuccess?.(data);
    },
    onError: (err) => {
      options?.onError?.(err);
    },
  });
}

export interface UseRunAdminNotificationWorkerOptions {
  onSuccess?: (processedCount: number) => void;
  onError?: (error: ApiError | Error) => void;
}

export function useRunAdminNotificationWorker(
  options?: UseRunAdminNotificationWorkerOptions
) {
  const queryClient = useQueryClient();

  return useMutation<number, ApiError | Error, NotificationWorkerParams | undefined>({
    mutationFn: (params) => runAdminNotificationWorker(params),
    retry: false, // Strict: Never silently retry worker execution
    onSuccess: (processedCount) => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, "notifications"],
      });
      options?.onSuccess?.(processedCount);
    },
    onError: (err) => {
      options?.onError?.(err);
    },
  });
}
