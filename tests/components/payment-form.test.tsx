import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentForm } from '@/features/payments/components/payment-form';
import * as paymentsApi from '@/features/payments/api/payments-api';
import { ApiError } from '@/lib/api/client';
import type { PaymentResponse } from '@/types/payment';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PaymentForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required fields: Payee, Amount, Currency, and Test Payment Method', () => {
    renderWithClient(<PaymentForm />);

    expect(screen.getByLabelText(/Payee Account ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Payment Method/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review Payment/i })).toBeInTheDocument();
  });

  it('validates client-side inputs when submitting invalid/empty form', async () => {
    renderWithClient(<PaymentForm />);

    fireEvent.click(screen.getByRole('button', { name: /Review Payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/Payee account ID is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Amount is required/i)).toBeInTheDocument();
    });
  });

  it('validates invalid UUID and invalid amount decimal format', async () => {
    renderWithClient(<PaymentForm />);

    fireEvent.change(screen.getByLabelText(/Payee Account ID/i), {
      target: { value: 'not-a-uuid' },
    });
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: '12.345' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Review Payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/Must be a valid UUID/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid amount format/i)).toBeInTheDocument();
    });
  });

  it('opens confirmation dialog on valid input and displays review summary', async () => {
    renderWithClient(<PaymentForm />);

    fireEvent.change(screen.getByLabelText(/Payee Account ID/i), {
      target: { value: '123e4567-e89b-12d3-a456-426614174000' },
    });
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: '10.50' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Review Payment/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Confirm Payment/i })).toBeInTheDocument();
      expect(screen.getByText(/123e4567-e89b-12d3-a456-426614174000/)).toBeInTheDocument();
      expect(screen.getByText(/10.50/)).toBeInTheDocument();
    });

    // Close dialog
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('generates idempotency key on confirm, submits payload, and redirects to payment detail', async () => {
    const mockPayment: PaymentResponse = {
      paymentId: 'pay_987654',
      idempotencyKey: 'idemp_111',
      payerAccountId: 'acc_payer_1',
      payeeAccountId: '123e4567-e89b-12d3-a456-426614174000',
      amountMinor: 1050,
      feeAmountMinor: 0,
      currency: 'USD',
      status: 'SETTLED',
      createdAt: new Date().toISOString(),
    };

    const createSpy = vi.spyOn(paymentsApi, 'createPayment').mockResolvedValue(mockPayment);

    renderWithClient(<PaymentForm />);

    fireEvent.change(screen.getByLabelText(/Payee Account ID/i), {
      target: { value: '123e4567-e89b-12d3-a456-426614174000' },
    });
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: '10.50' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Review Payment/i }));

    const confirmBtn = await screen.findByRole('button', { name: /Confirm & Pay/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      const callArgs = createSpy.mock.calls[0]!;
      expect(callArgs[0]).toEqual({
        payeeAccountId: '123e4567-e89b-12d3-a456-426614174000',
        amountMinor: 1050,
        currency: 'USD',
        paymentMethodToken: 'tok_visa',
      });
      // Verify idempotency key is a valid UUID
      expect(callArgs[1]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(mockPush).toHaveBeenCalledWith('/payments/pay_987654');
    });
  });

  it('handles backend error response properly without closing form', async () => {
    vi.spyOn(paymentsApi, 'createPayment').mockRejectedValue(
      new ApiError({
        type: 'https://api.paymentledger.com/errors/INSUFFICIENT_FUNDS',
        title: 'Unprocessable Entity',
        status: 422,
        detail: 'Payer account does not have sufficient balance',
        errorCode: 'INSUFFICIENT_FUNDS',
        timestamp: new Date().toISOString(),
      })
    );

    renderWithClient(<PaymentForm />);

    fireEvent.change(screen.getByLabelText(/Payee Account ID/i), {
      target: { value: '123e4567-e89b-12d3-a456-426614174000' },
    });
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: '10.50' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Review Payment/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirm & Pay/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Payer account does not have sufficient balance/i)).toBeInTheDocument();
    });
  });
});
