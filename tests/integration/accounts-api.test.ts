import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccount } from '@/features/accounts/api/accounts-api';
import * as apiClient from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';
import type { AccountResponse } from '@/types/account';

describe('Accounts API Integration', () => {
  const validUuid = 'a3b4c5d6-e7f8-4901-a234-56789abcdef0';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid UUID before calling apiFetch', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch');

    await expect(getAccount('invalid-id')).rejects.toThrow('Invalid Account ID format');
    expect(apiFetchSpy).not.toHaveBeenCalled();
  });

  it('successfully fetches and returns AccountResponse on 200 OK', async () => {
    const mockResponse: AccountResponse = {
      accountId: validUuid,
      accountNumber: 'ACC-USD-123456',
      ownerId: 'f1e2d3c4-b5a6-4789-8012-3456789abcde',
      accountType: 'CUSTOMER',
      currency: 'USD',
      status: 'ACTIVE',
      createdAt: '2026-09-25T12:00:00Z',
    };

    vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce(mockResponse);

    const result = await getAccount(validUuid);
    expect(result).toEqual(mockResponse);
    expect(apiClient.apiFetch).toHaveBeenCalledWith(`/api/v1/accounts/${validUuid}`);
  });

  it('propagates ApiError with RFC 7807 problem details on 404', async () => {
    const notFoundError = new ApiError({
      type: 'https://api.paymentledger.com/errors/RESOURCE_NOT_FOUND',
      title: 'Resource Not Found',
      status: 404,
      detail: 'Account not found or access denied',
      instance: `/api/v1/accounts/${validUuid}`,
      errorCode: 'RESOURCE_NOT_FOUND',
      correlationId: 'test-corr-404',
      timestamp: '2026-09-25T12:00:00Z',
    });

    vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(notFoundError);

    await expect(getAccount(validUuid)).rejects.toThrow('Account not found or access denied');
  });
});
