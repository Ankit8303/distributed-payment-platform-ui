import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPayment, getPayment } from '@/features/payments/api/payments-api';
import * as apiClient from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';
import type { PaymentResponse, PaymentCreateRequest } from '@/types/payment';

describe('Payments API Integration', () => {
  const validPayeeId = '123e4567-e89b-12d3-a456-426614174000';
  const validIdempotencyKey = 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d';
  const validRequest: PaymentCreateRequest = {
    payeeAccountId: validPayeeId,
    amountMinor: 2500,
    currency: 'USD',
    paymentMethodToken: 'tok_visa',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPayment', () => {
    it('validates request schema before calling apiFetch', async () => {
      const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch');

      const invalidRequest = { ...validRequest, amountMinor: 0 };
      await expect(
        createPayment(invalidRequest as PaymentCreateRequest, validIdempotencyKey)
      ).rejects.toThrow('Amount must be greater than zero');

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it('validates idempotency key format before calling apiFetch', async () => {
      const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch');

      await expect(createPayment(validRequest, 'invalid-key')).rejects.toThrow(
        'Invalid idempotency key format: must be RFC 4122 v4 UUID'
      );

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it('sends POST /api/v1/payments with required headers and frozen payload', async () => {
      const mockResponse: PaymentResponse = {
        paymentId: 'pay_123',
        idempotencyKey: validIdempotencyKey,
        payerAccountId: 'acc_payer_1',
        payeeAccountId: validPayeeId,
        amountMinor: 2500,
        feeAmountMinor: 50,
        currency: 'USD',
        status: 'SETTLED',
        createdAt: '2026-09-25T12:00:00Z',
      };

      const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce(mockResponse);

      const result = await createPayment(validRequest, validIdempotencyKey);

      expect(result).toEqual(mockResponse);
      expect(apiFetchSpy).toHaveBeenCalledTimes(1);

      const callArgs = apiFetchSpy.mock.calls[0]!;
      const [endpoint, options] = callArgs;
      expect(endpoint).toBe('/api/v1/payments');
      expect(options?.method).toBe('POST');
      expect(JSON.parse(options?.body as string)).toEqual(validRequest);
      expect(options?.idempotencyKey).toBe(validIdempotencyKey);
      expect(options?.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('handles 202 Accepted with PENDING_RECONCILIATION status', async () => {
      const mockResponse: PaymentResponse = {
        paymentId: 'pay_async_456',
        idempotencyKey: validIdempotencyKey,
        payerAccountId: 'acc_payer_1',
        payeeAccountId: validPayeeId,
        amountMinor: 2500,
        feeAmountMinor: 0,
        currency: 'USD',
        status: 'PENDING_RECONCILIATION',
        pollUrl: '/api/v1/payments/pay_async_456',
        createdAt: '2026-09-25T12:00:00Z',
      };

      vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce(mockResponse);

      const result = await createPayment(validRequest, validIdempotencyKey);
      expect(result.status).toBe('PENDING_RECONCILIATION');
      expect(result.paymentId).toBe('pay_async_456');
    });

    it('propagates ApiError on 409 IDEMPOTENCY_CONCURRENT_REQUEST', async () => {
      const conflictError = new ApiError({
        type: 'https://api.paymentledger.com/errors/IDEMPOTENCY_CONCURRENT_REQUEST',
        title: 'Conflict',
        status: 409,
        detail: 'A concurrent request with the same idempotency key is currently processing',
        errorCode: 'IDEMPOTENCY_CONCURRENT_REQUEST',
        timestamp: '2026-09-25T12:00:00Z',
      });

      vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(conflictError);

      await expect(createPayment(validRequest, validIdempotencyKey)).rejects.toThrow(
        'A concurrent request with the same idempotency key is currently processing'
      );
    });

    it('propagates ApiError on 422 INSUFFICIENT_FUNDS', async () => {
      const unprocessableError = new ApiError({
        type: 'https://api.paymentledger.com/errors/INSUFFICIENT_FUNDS',
        title: 'Unprocessable Entity',
        status: 422,
        detail: 'Payer account does not have sufficient funds',
        errorCode: 'INSUFFICIENT_FUNDS',
        timestamp: '2026-09-25T12:00:00Z',
      });

      vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(unprocessableError);

      await expect(createPayment(validRequest, validIdempotencyKey)).rejects.toThrow(
        'Payer account does not have sufficient funds'
      );
    });
  });

  describe('getPayment', () => {
    const paymentId = 'pay_test_789';

    it('rejects invalid or empty paymentId', async () => {
      const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch');

      await expect(getPayment('')).rejects.toThrow('Payment ID is required');
      await expect(getPayment('   ')).rejects.toThrow('Payment ID is required');

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it('fetches GET /api/v1/payments/{id} and returns PaymentResponse', async () => {
      const mockResponse: PaymentResponse = {
        paymentId,
        idempotencyKey: validIdempotencyKey,
        payerAccountId: 'acc_payer_1',
        payeeAccountId: validPayeeId,
        amountMinor: 5000,
        feeAmountMinor: 100,
        currency: 'USD',
        status: 'SETTLED',
        createdAt: '2026-09-25T12:00:00Z',
      };

      const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce(mockResponse);

      const result = await getPayment(paymentId);
      expect(result).toEqual(mockResponse);
      expect(apiFetchSpy).toHaveBeenCalledWith(`/api/v1/payments/${paymentId}`, {
        method: 'GET',
        signal: undefined,
      });
    });

    it('propagates AbortSignal to apiFetch', async () => {
      const controller = new AbortController();
      const mockResponse: PaymentResponse = {
        paymentId,
        idempotencyKey: validIdempotencyKey,
        payerAccountId: 'acc_payer_1',
        payeeAccountId: validPayeeId,
        amountMinor: 5000,
        feeAmountMinor: 0,
        currency: 'USD',
        status: 'PROCESSING',
        createdAt: '2026-09-25T12:00:00Z',
      };

      const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce(mockResponse);

      await getPayment(paymentId, controller.signal);

      expect(apiFetchSpy).toHaveBeenCalledWith(`/api/v1/payments/${paymentId}`, {
        method: 'GET',
        signal: controller.signal,
      });
    });

    it('propagates ApiError on 404', async () => {
      const notFoundError = new ApiError({
        type: 'https://api.paymentledger.com/errors/RESOURCE_NOT_FOUND',
        title: 'Resource Not Found',
        status: 404,
        detail: 'Payment not found or access denied',
        errorCode: 'RESOURCE_NOT_FOUND',
        timestamp: '2026-09-25T12:00:00Z',
      });

      vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(notFoundError);

      await expect(getPayment(paymentId)).rejects.toThrow('Payment not found or access denied');
    });
  });
});
