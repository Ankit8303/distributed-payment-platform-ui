import { test, expect } from "@playwright/test";

test.describe("Phase F5 Refunds and Reversals E2E Tests", () => {
  const paymentId = "55555555-5555-5555-5555-555555555555";
  const refundId = "66666666-6666-6666-6666-666666666666";
  const reversalId = "77777777-7777-7777-7777-777777777777";

  const mockHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const mockPayload = Buffer.from(
    JSON.stringify({
      sub: "f1e2d3c4-b5a6-4789-8012-3456789abcde",
      role: "CUSTOMER",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString("base64");
  const validCustomerToken = `${mockHeader}.${mockPayload}.mock-sig`;

  test.beforeEach(async ({ page }) => {
    // Mock login endpoint
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: validCustomerToken,
          refreshToken: "mock-valid-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    // Mock session refresh
    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: validCustomerToken,
          refreshToken: "mock-valid-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    // Authenticate
    await page.goto("/login?redirect=%2Fdashboard");
    await page.fill("#login-email", "customer@paymentledger.com");
    await page.fill("#login-password", "ValidPass123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("executes Refund flow: Settled Payment -> Open Refund Modal -> Confirm -> Refund Detail", async ({
    page,
  }) => {
    // Mock GET /api/v1/payments/{paymentId}
    await page.route(`**/api/v1/payments/${paymentId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paymentId,
          idempotencyKey: "idem-payment-1",
          payerAccountId: "acc-payer",
          payeeAccountId: "acc-payee",
          amountMinor: 5000,
          feeAmountMinor: 100,
          currency: "USD",
          status: "SETTLED",
          createdAt: "2026-09-26T10:00:00Z",
        }),
      });
    });

    // Mock POST /api/v1/payments/{paymentId}/refunds
    await page.route(`**/api/v1/payments/${paymentId}/refunds`, async (route) => {
      const headers = route.request().headers();
      expect(headers["idempotency-key"]).toBeDefined();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          refundId,
          paymentId,
          amountMinor: 2500,
          currency: "USD",
          status: "SETTLED",
          reason: "Customer returned product",
          providerReference: "ref_gw_123",
          compensatingLedgerTransactionId: "comp-tx-1",
          failureReason: null,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Mock GET /api/v1/refunds/{refundId}
    await page.route(`**/api/v1/refunds/${refundId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          refundId,
          paymentId,
          amountMinor: 2500,
          currency: "USD",
          status: "SETTLED",
          reason: "Customer returned product",
          providerReference: "ref_gw_123",
          compensatingLedgerTransactionId: "comp-tx-1",
          failureReason: null,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`/payments/${paymentId}`);

    // Verify payment detail rendered with "Issue Refund" button
    const refundBtn = page.getByTestId("open-refund-modal-button");
    await expect(refundBtn).toBeVisible();
    await refundBtn.click();

    // Verify Refund Modal opened
    await expect(page.getByTestId("refund-modal")).toBeVisible();
    await page.fill('[data-testid="refund-amount-input"]', "25.00");
    await page.fill('[data-testid="refund-reason-input"]', "Customer returned product");

    await page.click('[data-testid="refund-review-button"]');

    // Confirm step
    const confirmBtn = page.getByTestId("refund-confirm-submit-button");
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verifies navigation to /refunds/{refundId}
    await expect(page).toHaveURL(new RegExp(`/refunds/${refundId}`));
    await expect(page.getByTestId("refund-status-card")).toBeVisible();
    await expect(page.getByText("$25.00")).toBeVisible();
    await expect(page.getByText("comp-tx-1")).toBeVisible();
  });

  test("executes Reversal flow: Settled Payment -> Open Reversal Modal -> Confirm Full Reversal -> Reversal Detail", async ({
    page,
  }) => {
    // Mock GET /api/v1/payments/{paymentId}
    await page.route(`**/api/v1/payments/${paymentId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paymentId,
          idempotencyKey: "idem-payment-2",
          payerAccountId: "acc-payer",
          payeeAccountId: "acc-payee",
          amountMinor: 5000,
          feeAmountMinor: 100,
          currency: "USD",
          status: "SETTLED",
          createdAt: "2026-09-26T10:00:00Z",
        }),
      });
    });

    // Mock POST /api/v1/payments/{paymentId}/reversal
    await page.route(`**/api/v1/payments/${paymentId}/reversal`, async (route) => {
      const headers = route.request().headers();
      expect(headers["idempotency-key"]).toBeDefined();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          reversalId,
          paymentId,
          amountMinor: 5000,
          currency: "USD",
          status: "COMPLETED",
          reason: "Duplicate charge reversal",
          compensatingLedgerTransactionId: "comp-tx-rev-1",
          failureReason: null,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Mock GET /api/v1/reversals/{reversalId}
    await page.route(`**/api/v1/reversals/${reversalId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reversalId,
          paymentId,
          amountMinor: 5000,
          currency: "USD",
          status: "COMPLETED",
          reason: "Duplicate charge reversal",
          compensatingLedgerTransactionId: "comp-tx-rev-1",
          failureReason: null,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`/payments/${paymentId}`);

    const reversalBtn = page.getByTestId("open-reversal-modal-button");
    await expect(reversalBtn).toBeVisible();
    await reversalBtn.click();

    // Verify Reversal Modal opened with full amount messaging
    await expect(page.getByTestId("reversal-modal")).toBeVisible();
    await expect(page.getByText(/Full original payment amount: \$50\.00/i)).toBeVisible();

    await page.fill('[data-testid="reversal-reason-input"]', "Duplicate charge reversal");
    await page.click('[data-testid="reversal-review-button"]');

    const confirmRevBtn = page.getByTestId("reversal-confirm-submit-button");
    await expect(confirmRevBtn).toBeVisible();
    await confirmRevBtn.click();

    // Verifies navigation to /reversals/{reversalId}
    await expect(page).toHaveURL(new RegExp(`/reversals/${reversalId}`));
    await expect(page.getByTestId("reversal-status-card")).toBeVisible();
    await expect(page.getByText("$50.00")).toBeVisible();
    await expect(page.getByText("comp-tx-rev-1")).toBeVisible();
  });
});
