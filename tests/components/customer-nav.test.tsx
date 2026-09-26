import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomerNav } from '@/components/navigation/customer-nav';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'f1e2d3c4-b5a6-4789-8012-3456789abcde',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    },
    logout: vi.fn(),
  }),
}));

describe('CustomerNav Component', () => {
  it('renders brand heading and user identity', () => {
    render(<CustomerNav />);

    expect(screen.getByText('Payment Platform')).toBeDefined();
    expect(screen.getByText('customer@example.com')).toBeDefined();
    expect(screen.getByText('CUSTOMER')).toBeDefined();
  });

  it('renders skip to main content link', () => {
    render(<CustomerNav />);

    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('renders sign out button with accessible label', () => {
    render(<CustomerNav />);

    const signOutBtn = screen.getByRole('button', { name: /Sign out/i });
    expect(signOutBtn).toBeDefined();
  });
});
