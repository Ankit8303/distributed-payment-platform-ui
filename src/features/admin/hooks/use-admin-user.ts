"use client";

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "./query-keys";
import { getAdminUser } from "@/lib/api/endpoints/admin-api";
import type { UserAdminResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export function useAdminUser(userId: string) {
  const normalizedId = userId?.trim();

  return useQuery<UserAdminResponse, ApiError | Error>({
    queryKey: adminKeys.user(normalizedId),
    queryFn: () => getAdminUser(normalizedId),
    enabled: Boolean(normalizedId),
    staleTime: 30 * 1000,
    retry: 1,
  });
}
