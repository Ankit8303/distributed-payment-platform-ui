import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccountStatusBadge } from '@/features/accounts/components/account-status-badge';

describe('AccountStatusBadge Component', () => {
  it('renders ACTIVE status with accessible label', () => {
    render(<AccountStatusBadge status="ACTIVE" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('Active');
    expect(badge.getAttribute('aria-label')).toContain('Active');
  });

  it('renders FROZEN status with warning indicator', () => {
    render(<AccountStatusBadge status="FROZEN" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('Frozen');
    expect(badge.getAttribute('aria-label')).toContain('Frozen');
  });

  it('renders CLOSED status', () => {
    render(<AccountStatusBadge status="CLOSED" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('Closed');
  });

  it('renders PENDING_VERIFICATION status', () => {
    render(<AccountStatusBadge status="PENDING_VERIFICATION" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('Pending Verification');
  });
});
