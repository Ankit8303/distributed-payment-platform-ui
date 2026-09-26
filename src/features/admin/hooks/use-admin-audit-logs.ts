"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminAuditLogs } from "@/lib/api/endpoints/admin-api";
import type { AuditQueryParams, AdminAuditLogResponse, Page } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminAuditLogsOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
  enabled?: boolean;
}

/**
 * Phase F7-G-F / F7-M Admin Audit Logs Query Hook
 * Fetches paginated audit logs from GET /api/v1/admin/audit-logs
 *
 * Invariants:
 * 1. Read-only: Audit logs are immutable evidence.
 * 2. Filterable: Supports filtering by resourceType, resourceId, and action.
 * 3. No Polling: Does not poll automatically.
 */
export function useAdminAuditLogs(
  params?: AuditQueryParams,
  options?: UseAdminAuditLogsOptions
) {
  return useQuery<Page<AdminAuditLogResponse>, ApiError | Error>({
    queryKey: adminKeys.auditLogs(params),
    queryFn: ({ signal }) => getAdminAuditLogs(params, { signal }),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
