"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminNotification } from "@/lib/api/endpoints/admin-api";
import type { NotificationDetailResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export function useAdminNotification(notificationId: string) {
  const normalizedId = notificationId?.trim();

  return useQuery<NotificationDetailResponse, ApiError | Error>({
    queryKey: adminKeys.notification(normalizedId),
    queryFn: () => getAdminNotification(normalizedId),
    enabled: Boolean(normalizedId),
    staleTime: 15 * 1000,
    retry: 1,
  });
}
