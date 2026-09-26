import { apiFetch } from '@/lib/api/client';
import { AccountResponse } from '@/types/account';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a given string is a valid RFC 4122 UUID.
 */
export function isValidUuid(id: string): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Fetches single account details by account UUID.
 * Endpoints: GET /api/v1/accounts/{id}
 */
export async function getAccount(accountId: string): Promise<AccountResponse> {
  const trimmed = accountId ? accountId.trim() : '';
  if (!isValidUuid(trimmed)) {
    throw new Error('Invalid Account ID format. Expected a valid 36-character UUID.');
  }

  return apiFetch<AccountResponse>(`/api/v1/accounts/${trimmed}`);
}
