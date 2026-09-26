'use client';

import { useQuery } from '@tanstack/react-query';
import { getAccount, isValidUuid } from '../api/accounts-api';
import { AccountResponse } from '@/types/account';
import { ApiError } from '@/lib/api/client';

export const accountKeys = {
  all: ['accounts'] as const,
  details: () => [...accountKeys.all, 'detail'] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
};

/**
 * Hook to fetch account information for a given account UUID.
 * Treated strictly as a client-side server-state cache.
 */
export function useAccount(accountId: string | null | undefined) {
  const normalizedId = accountId ? accountId.trim() : '';
  const isEnabled = Boolean(normalizedId && isValidUuid(normalizedId));

  return useQuery<AccountResponse, ApiError | Error>({
    queryKey: accountKeys.detail(normalizedId),
    queryFn: () => getAccount(normalizedId),
    enabled: isEnabled,
    staleTime: 30_000,   // 30 seconds
    gcTime: 300_000,     // 5 minutes
    retry: (failureCount, error) => {
      // Do NOT retry 401, 403, or 404
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: true,
  });
}
