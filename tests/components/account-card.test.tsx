import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccountCard } from '@/features/accounts/components/account-card';
import type { AccountResponse } from '@/types/account';

describe('AccountCard Component', () => {
  const mockAccount: AccountResponse = {
    accountId: 'a3b4c5d6-e7f8-4901-a234-56789abcdef0',
    accountNumber: 'ACC-USD-998877',
    ownerId: 'f1e2d3c4-b5a6-4789-8012-3456789abcde',
    accountType: 'CUSTOMER',
    currency: 'USD',
    status: 'ACTIVE',
    createdAt: '2026-09-20T10:00:00Z',
  };

  it('renders account number, currency, type, and status correctly', () => {
    render(<AccountCard account={mockAccount} />);

    expect(screen.getByText('ACC-USD-998877')).toBeDefined();
    expect(screen.getByText('USD')).toBeDefined();
    expect(screen.getByText('CUSTOMER')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('renders semantic section with accessible heading', () => {
    render(<AccountCard account={mockAccount} />);

    const section = screen.getByRole('region', { name: 'ACC-USD-998877' });
    expect(section).toBeDefined();
  });

  it('displays accountId for support reference', () => {
    render(<AccountCard account={mockAccount} />);

    expect(screen.getByText('a3b4c5d6-e7f8-4901-a234-56789abcdef0')).toBeDefined();
  });
});
