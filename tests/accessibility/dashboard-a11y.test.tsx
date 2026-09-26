import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomerNav } from '@/components/navigation/customer-nav';
import { AccountStatusBadge } from '@/features/accounts/components/account-status-badge';
import { AccountCard } from '@/features/accounts/components/account-card';
import { AccountErrorState } from '@/features/accounts/components/account-error-state';
import { ApiError } from '@/lib/api/client';
import type { AccountResponse } from '@/types/account';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com', role: 'CUSTOMER' },
    logout: vi.fn(),
  }),
}));

describe('Phase F2 Accessibility Audit', () => {
  it('provides header landmark, skip-link, and accessible navigation in CustomerNav', () => {
    render(<CustomerNav />);

    const header = screen.getByRole('banner');
    expect(header).toBeDefined();

    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink.tagName.toLowerCase()).toBe('a');
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('provides accessible status announcement and role for AccountStatusBadge', () => {
    render(<AccountStatusBadge status="FROZEN" />);

    const statusEl = screen.getByRole('status');
    expect(statusEl.getAttribute('aria-label')).toContain('Frozen');
  });

  it('renders semantic region with labeledby heading in AccountCard', () => {
    const mockAccount: AccountResponse = {
      accountId: 'a3b4c5d6-e7f8-4901-a234-56789abcdef0',
      accountNumber: 'ACC-USD-554433',
      ownerId: 'f1e2d3c4-b5a6-4789-8012-3456789abcde',
      accountType: 'CUSTOMER',
      currency: 'USD',
      status: 'ACTIVE',
      createdAt: '2026-09-25T12:00:00Z',
    };

    render(<AccountCard account={mockAccount} />);
    const region = screen.getByRole('region', { name: 'ACC-USD-554433' });
    expect(region).toBeDefined();
  });

  it('renders role="alert" with assertive aria-live for AccountErrorState', () => {
    const error = new ApiError({
      type: 'https://api.paymentledger.com/errors/RESOURCE_NOT_FOUND',
      title: 'Resource Not Found',
      status: 404,
      detail: 'Account not found or access denied',
      instance: '/api/v1/accounts/123',
      errorCode: 'RESOURCE_NOT_FOUND',
      correlationId: 'corr-12345',
      timestamp: '2026-09-25T12:00:00Z',
    });

    render(<AccountErrorState error={error} />);
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.textContent).toContain('Account Not Found');
    expect(alert.textContent).toContain('corr-12345');
  });
});
