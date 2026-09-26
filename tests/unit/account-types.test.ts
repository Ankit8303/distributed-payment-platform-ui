import { describe, it, expect } from 'vitest';
import { isValidUuid } from '@/features/accounts/api/accounts-api';
import type { AccountResponse, AccountStatus, AccountType } from '@/types/account';

describe('Account Types & UUID Validation', () => {
  it('validates standard RFC 4122 v4 UUIDs', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(isValidUuid(validUuid)).toBe(true);
  });

  it('rejects invalid or malformed UUID strings', () => {
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('12345')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400Z')).toBe(false); // non-hex character
    expect(isValidUuid('123e4567-e89b-12d3-a456-4266141740001')).toBe(false); // too long
  });

  it('handles surrounding whitespace gracefully in validation', () => {
    expect(isValidUuid('  123e4567-e89b-12d3-a456-426614174000  ')).toBe(true);
  });

  it('strictly models AccountResponse matching frozen backend contract', () => {
    const mockAccount: AccountResponse = {
      accountId: 'a3b4c5d6-e7f8-4901-a234-56789abcdef0',
      accountNumber: 'ACC-USD-104928',
      ownerId: 'f1e2d3c4-b5a6-4789-8012-3456789abcde',
      accountType: 'CUSTOMER' as AccountType,
      currency: 'USD',
      status: 'ACTIVE' as AccountStatus,
      createdAt: '2026-09-25T18:30:00Z',
    };

    expect(mockAccount.accountId).toBeDefined();
    expect(mockAccount.accountNumber).toMatch(/^ACC-/);
    expect(mockAccount.currency).toBe('USD');
    expect(mockAccount.status).toBe('ACTIVE');
    // Invariant: AccountResponse does NOT contain balance
    expect((mockAccount as unknown as Record<string, unknown>).balance).toBeUndefined();
    expect((mockAccount as unknown as Record<string, unknown>).balanceMinor).toBeUndefined();
  });
});
