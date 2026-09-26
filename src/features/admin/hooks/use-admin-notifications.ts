"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminNotifications } from "@/lib/api/endpoints/admin-api";
import type { Page, NotificationAdminResponse, NotificationQueryParams } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminNotificationsOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

export function normalizeNotificationQueryParams(
  params?: NotificationQueryParams
): NotificationQueryParams | undefined {
  if (!params) return undefined;
  const { page, size, sort, status } = params;
  const normalized: NotificationQueryParams = {};

  if (page !== undefined) normalized.page = page;
  if (size !== undefined) normalized.size = size;
  if (sort !== undefined) normalized.sort = sort;
  if (status) normalized.status = status;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function useAdminNotifications(
  params?: NotificationQueryParams,
  options?: UseAdminNotificationsOptions
) {
  const normalizedParams = normalizeNotificationQueryParams(params);

  return useQuery<Page<NotificationAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.notifications(normalizedParams),
    queryFn: () => getAdminNotifications(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
    retry: options?.retry ?? 1,
  });
}
