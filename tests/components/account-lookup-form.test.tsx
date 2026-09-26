import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountLookupForm } from '@/features/accounts/components/account-lookup-form';

describe('AccountLookupForm Component', () => {
  it('validates UUID and invokes onLookup for valid format', () => {
    const handleLookup = vi.fn();
    render(<AccountLookupForm onLookup={handleLookup} />);

    const input = screen.getByLabelText(/Query Account by ID/i);
    const submitBtn = screen.getByRole('button', { name: /Inspect Account/i });

    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    fireEvent.change(input, { target: { value: validUuid } });
    fireEvent.click(submitBtn);

    expect(handleLookup).toHaveBeenCalledWith(validUuid);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('displays client error when submitting empty input', () => {
    const handleLookup = vi.fn();
    render(<AccountLookupForm onLookup={handleLookup} />);

    const submitBtn = screen.getByRole('button', { name: /Inspect Account/i });
    fireEvent.click(submitBtn);

    expect(handleLookup).not.toHaveBeenCalled();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Account ID is required');
  });

  it('displays client error when submitting malformed UUID', () => {
    const handleLookup = vi.fn();
    render(<AccountLookupForm onLookup={handleLookup} />);

    const input = screen.getByLabelText(/Query Account by ID/i);
    const submitBtn = screen.getByRole('button', { name: /Inspect Account/i });

    fireEvent.change(input, { target: { value: 'not-a-valid-uuid' } });
    fireEvent.click(submitBtn);

    expect(handleLookup).not.toHaveBeenCalled();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Invalid format');
  });
});
