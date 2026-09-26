import { describe, it, expect } from 'vitest';
import { accountKeys } from '@/features/accounts/hooks/use-account';

describe('Account Query Keys Factory', () => {
  it('generates consistent root query key', () => {
    expect(accountKeys.all).toEqual(['accounts']);
  });

  it('generates consistent detail root query key', () => {
    expect(accountKeys.details()).toEqual(['accounts', 'detail']);
  });

  it('generates consistent parameterized detail query key', () => {
    const uuid = 'a3b4c5d6-e7f8-4901-a234-56789abcdef0';
    expect(accountKeys.detail(uuid)).toEqual(['accounts', 'detail', uuid]);
  });
});
