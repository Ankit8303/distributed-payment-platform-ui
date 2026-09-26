"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminUsers } from "@/lib/api/endpoints/admin-api";
import type { Page, UserAdminResponse, UserQueryParams } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface UseAdminUsersOptions {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
}

export function normalizeUserQueryParams(
  params?: UserQueryParams
): UserQueryParams | undefined {
  if (!params) return undefined;
  const { page, size, sort, role, status, email } = params;
  const normalized: UserQueryParams = {};

  if (page !== undefined) normalized.page = page;
  if (size !== undefined) normalized.size = size;
  if (sort !== undefined) normalized.sort = sort;
  if (role) normalized.role = role;
  if (status) normalized.status = status;
  if (email && email.trim()) normalized.email = email.trim();

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function useAdminUsers(
  params?: UserQueryParams,
  options?: UseAdminUsersOptions
) {
  const normalizedParams = normalizeUserQueryParams(params);

  return useQuery<Page<UserAdminResponse>, ApiError | Error>({
    queryKey: adminKeys.users(normalizedParams),
    queryFn: () => getAdminUsers(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    retry: options?.retry ?? 1,
  });
}
