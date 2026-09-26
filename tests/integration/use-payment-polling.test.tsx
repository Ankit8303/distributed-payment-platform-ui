import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePayment } from '@/features/payments/hooks/use-payment';
import * as paymentsApi from '@/features/payments/api/payments-api';
import type { PaymentResponse } from '@/types/payment';

describe('usePayment Polling Coordinator', () => {
  let queryClient: QueryClient;

  const mockBasePayment: PaymentResponse = {
    paymentId: 'pay_poll_123',
    idempotencyKey: 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d',
    payerAccountId: 'acc_payer',
    payeeAccountId: 'acc_payee',
    amountMinor: 1000,
    feeAmountMinor: 0,
    currency: 'USD',
    status: 'PENDING_RECONCILIATION',
    createdAt: new Date().toISOString(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  it('does not start polling coordinator when status is SETTLED', async () => {
    const settledPayment: PaymentResponse = {
      ...mockBasePayment,
      status: 'SETTLED',
    };

    const getSpy = vi.spyOn(paymentsApi, 'getPayment').mockResolvedValue(settledPayment);

    const { result } = renderHook(
      () =>
        usePayment('pay_poll_123', {
          enablePolling: true,
          pollIntervalMs: 30,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPollingActive).toBe(false);
    expect(result.current.isPollingExhausted).toBe(false);

    // Wait a brief delay to ensure no polling occurs
    await new Promise((r) => setTimeout(r, 80));

    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('polls at intervals when status is PENDING_RECONCILIATION and stops when SETTLED', async () => {
    let callCount = 0;
    const getSpy = vi.spyOn(paymentsApi, 'getPayment').mockImplementation(async () => {
      callCount += 1;
      if (callCount >= 3) {
        return { ...mockBasePayment, status: 'SETTLED' };
      }
      return { ...mockBasePayment, status: 'PENDING_RECONCILIATION' };
    });

    const { result } = renderHook(
      () =>
        usePayment('pay_poll_123', {
          enablePolling: true,
          pollIntervalMs: 25,
        }),
      { wrapper }
    );

    // Initial query
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Wait for polling transition to SETTLED
    await waitFor(
      () => {
        expect(result.current.data?.status).toBe('SETTLED');
      },
      { timeout: 2000 }
    );

    expect(result.current.isPollingActive).toBe(false);
    expect(getSpy).toHaveBeenCalledTimes(3);
  });

  it('stops polling and marks exhausted after reaching maximum attempts', async () => {
    vi.spyOn(paymentsApi, 'getPayment').mockResolvedValue({
      ...mockBasePayment,
      status: 'PENDING_RECONCILIATION',
    });

    const { result } = renderHook(
      () =>
        usePayment('pay_poll_123', {
          enablePolling: true,
          pollIntervalMs: 20,
          maxPollAttempts: 3,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    await waitFor(
      () => {
        expect(result.current.isPollingExhausted).toBe(true);
      },
      { timeout: 2000 }
    );

    expect(result.current.isPollingActive).toBe(false);
  });

  it('cleans up pending timer and active abort controller on unmount', async () => {
    const getSpy = vi.spyOn(paymentsApi, 'getPayment').mockResolvedValue({
      ...mockBasePayment,
      status: 'PENDING_RECONCILIATION',
    });

    const { unmount } = renderHook(
      () =>
        usePayment('pay_poll_123', {
          enablePolling: true,
          pollIntervalMs: 30,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Wait long enough for potential poll to fire if not cleaned up
    await new Promise((r) => setTimeout(r, 100));

    expect(getSpy).toHaveBeenCalledTimes(1);
  });
});
