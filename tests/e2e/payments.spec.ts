import { test, expect } from '@playwright/test';

test.describe('Phase F3 Payment Creation and Lifecycle E2E Tests', () => {
  const validPayeeId = '123e4567-e89b-12d3-a456-426614174000';

  const mockHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const mockPayload = Buffer.from(
    JSON.stringify({
      sub: 'f1e2d3c4-b5a6-4789-8012-3456789abcde',
      role: 'CUSTOMER',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64');
  const validCustomerToken = `${mockHeader}.${mockPayload}.mock-sig`;

  test('redirects unauthenticated visitor from /payments/new to /login', async ({ page }) => {
    await page.goto('/payments/new');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpayments%2Fnew/);
    await expect(page.locator('#login-email')).toBeVisible();
  });

  test('redirects unauthenticated visitor from /payments/[id] to /login', async ({ page }) => {
    await page.goto('/payments/pay_test_123');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpayments%2Fpay_test_123/);
    await expect(page.locator('#login-email')).toBeVisible();
  });

  test.describe('Approved End-to-End Payment Journey (Login -> Dashboard -> New Payment -> Detail)', () => {
    test.beforeEach(async ({ page }) => {
      // Mock login endpoint
      await page.route('**/api/v1/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: validCustomerToken,
            refreshToken: 'mock-valid-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
          }),
        });
      });

      // Mock session refresh
      await page.route('**/api/v1/auth/refresh', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: validCustomerToken,
            refreshToken: 'mock-valid-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
          }),
        });
      });
    });

    test('executes complete journey: Login -> Dashboard -> Payments -> Review -> Confirm -> Settled Detail', async ({
      page,
    }) => {
      let capturedIdempotencyKey: string | null = null;
      let capturedPayload: unknown = null;

      await page.route('**/api/v1/payments', async (route) => {
        const headers = route.request().headers();
        capturedIdempotencyKey = headers['idempotency-key'] || null;
        capturedPayload = JSON.parse(route.request().postData() || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            paymentId: 'pay_e2e_settled_001',
            idempotencyKey: capturedIdempotencyKey,
            payerAccountId: 'acc_payer_customer_1',
            payeeAccountId: validPayeeId,
            amountMinor: 2550,
            feeAmountMinor: 50,
            currency: 'USD',
            status: 'SETTLED',
            createdAt: new Date().toISOString(),
          }),
        });
      });

      await page.route('**/api/v1/payments/pay_e2e_settled_001', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            paymentId: 'pay_e2e_settled_001',
            idempotencyKey: capturedIdempotencyKey,
            payerAccountId: 'acc_payer_customer_1',
            payeeAccountId: validPayeeId,
            amountMinor: 2550,
            feeAmountMinor: 50,
            currency: 'USD',
            status: 'SETTLED',
            createdAt: new Date().toISOString(),
          }),
        });
      });

      // Login
      await page.goto('/login?redirect=%2Fdashboard');
      await page.locator('#login-email').fill('customer@example.com');
      await page.locator('#login-password').fill('ValidPass123!@#');
      await page.locator('button[type="submit"]').click();

      // 2. Arrive at Customer Dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // 3. Navigate to New Payment via sidebar or direct link
      await page.goto('/payments/new');

      // 4. Form inputs rendered and fillable
      await expect(page.locator('#payeeAccountId')).toBeVisible();
      await expect(page.locator('#amountDecimal')).toBeVisible();
      await expect(page.locator('#currency')).toBeVisible();

      await page.locator('#payeeAccountId').fill(validPayeeId);
      await page.locator('#amountDecimal').fill('25.50');

      // 5. Review Payment triggers client validation and shows confirmation modal
      await page.locator('button:has-text("Review Payment")').click();

      const dialog = page.locator('[data-testid="payment-confirm-dialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(validPayeeId);
      await expect(dialog).toContainText('$25.50');

      // 6. Confirm & Pay binds payload + idempotency key K1 and submits
      await dialog.locator('button:has-text("Confirm & Pay")').click();

      // 7. Redirect to authoritative payment detail
      await expect(page).toHaveURL(/\/payments\/pay_e2e_settled_001/);

      // 8. Verify authoritative status and details
      await expect(page.locator('[data-testid="payment-status-badge"]')).toContainText('Settled');
      await expect(page.locator('h2')).toContainText('pay_e2e_settled_001');

      // Verify idempotency invariant
      expect(capturedIdempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(capturedPayload).toEqual({
        payeeAccountId: validPayeeId,
        amountMinor: 2550,
        currency: 'USD',
        paymentMethodToken: 'tok_visa',
      });
    });

    test('handles PENDING_RECONCILIATION with polling and manual check status', async ({
      page,
    }) => {
      let pollCount = 0;

      await page.route('**/api/v1/payments', async (route) => {
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            paymentId: 'pay_e2e_recon_002',
            idempotencyKey: '00000000-0000-4000-8000-000000000002',
            payerAccountId: 'acc_payer_customer_1',
            payeeAccountId: validPayeeId,
            amountMinor: 1000,
            feeAmountMinor: 0,
            currency: 'USD',
            status: 'PENDING_RECONCILIATION',
            createdAt: new Date().toISOString(),
          }),
        });
      });

      await page.route('**/api/v1/payments/pay_e2e_recon_002', async (route) => {
        pollCount += 1;
        const currentStatus = pollCount >= 3 ? 'SETTLED' : 'PENDING_RECONCILIATION';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            paymentId: 'pay_e2e_recon_002',
            idempotencyKey: '00000000-0000-4000-8000-000000000002',
            payerAccountId: 'acc_payer_customer_1',
            payeeAccountId: validPayeeId,
            amountMinor: 1000,
            feeAmountMinor: 0,
            currency: 'USD',
            status: currentStatus,
            createdAt: new Date().toISOString(),
          }),
        });
      });

      // Login
      await page.goto('/login?redirect=%2Fdashboard');
      await page.locator('#login-email').fill('customer@example.com');
      await page.locator('#login-password').fill('ValidPass123!@#');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/dashboard/);

      // Create Payment
      await page.goto('/payments/new');
      await page.locator('#payeeAccountId').fill(validPayeeId);
      await page.locator('#amountDecimal').fill('10.00');

      await page.locator('button:has-text("Review Payment")').click();
      await page
        .locator('[data-testid="payment-confirm-dialog"] button:has-text("Confirm & Pay")')
        .click();

      await expect(page).toHaveURL(/\/payments\/pay_e2e_recon_002/);

      // Banner is visible during reconciliation
      await expect(page.locator('[data-testid="payment-reconciliation-banner"]')).toBeVisible();

      // Click manual "Check Status"
      const checkStatusBtn = page.locator(
        '[data-testid="payment-reconciliation-banner"] button:has-text("Check Status")'
      );
      if (await checkStatusBtn.isVisible()) {
        await checkStatusBtn.click();
      }

      // Authoritative status settles
      await expect(page.locator('[data-testid="payment-status-badge"]')).toContainText('Settled');
    });

    test('displays RFC 7807 problem details on 422 INSUFFICIENT_FUNDS without navigating away', async ({
      page,
    }) => {
      await page.route('**/api/v1/payments', async (route) => {
        await route.fulfill({
          status: 422,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            type: 'https://api.paymentledger.com/errors/INSUFFICIENT_FUNDS',
            title: 'Unprocessable Entity',
            status: 422,
            detail: 'Payer account does not have sufficient funds',
            errorCode: 'INSUFFICIENT_FUNDS',
            correlationId: 'test-insufficient-funds-corr',
            timestamp: new Date().toISOString(),
          }),
        });
      });

      // Login
      await page.goto('/login?redirect=%2Fdashboard');
      await page.locator('#login-email').fill('customer@example.com');
      await page.locator('#login-password').fill('ValidPass123!@#');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/dashboard/);

      // Payment Form
      await page.goto('/payments/new');
      await page.locator('#payeeAccountId').fill(validPayeeId);
      await page.locator('#amountDecimal').fill('9999.00');

      await page.locator('button:has-text("Review Payment")').click();
      await page
        .locator('[data-testid="payment-confirm-dialog"] button:has-text("Confirm & Pay")')
        .click();

      // Remains on /payments/new and shows error state
      await expect(page).toHaveURL(/\/payments\/new/);
      const errorAlert = page.locator('[data-testid="payment-error-state"]');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText('Payer account does not have sufficient funds');
      await expect(errorAlert).toContainText('test-insufficient-funds-corr');
    });
  });
});
