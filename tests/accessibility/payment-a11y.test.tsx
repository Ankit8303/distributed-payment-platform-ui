import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PaymentStatusBadge } from '@/features/payments/components/payment-status-badge';
import { PaymentReconciliationBanner } from '@/features/payments/components/payment-reconciliation-banner';
import { PaymentErrorState } from '@/features/payments/components/payment-error-state';
import { PaymentStatusCard } from '@/features/payments/components/payment-status-card';
import { PaymentConfirmDialog } from '@/features/payments/components/payment-confirm-dialog';
import { SANDBOX_PAYMENT_METHODS } from '@/features/payments/tokens/payment-method-tokens';
import { ApiError } from '@/lib/api/client';
import type { PaymentResponse } from '@/types/payment';

describe('Phase F3 Accessibility Audit', () => {
  it('PaymentStatusBadge provides role="status" and distinct semantic aria-label', () => {
    const { rerender } = render(<PaymentStatusBadge status="SETTLED" />);
    let badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-label')).toBe('Payment status: Settled');

    rerender(<PaymentStatusBadge status="PENDING_RECONCILIATION" />);
    badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-label')).toBe('Payment status: Reconciliation In Progress');

    rerender(<PaymentStatusBadge status="DECLINED" />);
    badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-label')).toBe('Payment status: Declined');

    rerender(<PaymentStatusBadge status="SOMETHING_UNEXPECTED" />);
    badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-label')).toBe('Payment status: Status Unknown');
  });

  it('PaymentReconciliationBanner renders role="alert" with polite aria-live and accessible check button', () => {
    render(
      <PaymentReconciliationBanner
        isPollingActive={true}
        pollAttemptCount={2}
        isPollingExhausted={false}
        onCheckStatus={vi.fn()}
      />
    );

    const banner = screen.getByRole('alert');
    expect(banner.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('button', { name: /Check Status/i })).toBeInTheDocument();
  });

  it('PaymentErrorState renders role="alert" with assertive aria-live and displays correlation ID', () => {
    const error = new ApiError({
      type: 'https://api.paymentledger.com/errors/IDEMPOTENCY_CONCURRENT_REQUEST',
      title: 'Conflict',
      status: 409,
      detail: 'Concurrent request conflict',
      errorCode: 'IDEMPOTENCY_CONCURRENT_REQUEST',
      correlationId: 'corr-9988-a11y',
      timestamp: new Date().toISOString(),
    });

    render(<PaymentErrorState error={error} />);
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.textContent).toContain('Conflict');
    expect(alert.textContent).toContain('corr-9988-a11y');
  });

  it('PaymentConfirmDialog satisfies WCAG dialog semantics with aria-modal and focusable actions', () => {
    render(
      <PaymentConfirmDialog
        isOpen={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        isSubmitting={false}
        payeeAccountId="123e4567-e89b-12d3-a456-426614174000"
        amountMinor={2500}
        currency="USD"
        paymentMethod={SANDBOX_PAYMENT_METHODS[0]!}
      />
    );

    const dialog = screen.getByRole('dialog', { name: /Confirm Payment/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    expect(screen.getByRole('button', { name: /Confirm & Pay/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('PaymentStatusCard provides semantic region with labeled heading', () => {
    const mockPayment: PaymentResponse = {
      paymentId: 'pay_a11y_111',
      idempotencyKey: 'idemp_a11y',
      payerAccountId: 'acc_payer',
      payeeAccountId: 'acc_payee',
      amountMinor: 3500,
      feeAmountMinor: 50,
      currency: 'USD',
      status: 'SETTLED',
      createdAt: '2026-09-25T14:30:00Z',
    };

    render(<PaymentStatusCard payment={mockPayment} />);
    const region = screen.getByRole('region', { name: /Payment Details/i });
    expect(region).toBeInTheDocument();
    expect(screen.getByText('pay_a11y_111')).toBeInTheDocument();
  });
});
