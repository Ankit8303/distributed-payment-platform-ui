import { test, expect } from "@playwright/test";

test.describe("Phase F7-D Admin Payment Operations E2E Tests", () => {
  test("redirects unauthenticated visitor from /admin/payments to /login", async ({
    page,
  }) => {
    await page.goto("/admin/payments");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fpayments/);
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("loads admin payments list, filters, and navigates to payment detail for ADMIN user", async ({
    page,
  }) => {
    const mockPaymentId = "pay-11111111-2222-3333-4444-555555555555";

    // Generate valid JWT with ADMIN role
    const claims = {
      sub: "admin-e2e-uuid",
      email: "admin@platform.local",
      role: "ADMIN",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7200,
    };
    const b64Payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const mockJwt = `eyJhbGciOiJIUzI1NiJ9.${b64Payload}.mockSignature`;

    // Intercept auth refresh endpoint
    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-refresh-token-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    // Intercept backend payments list API
    await page.route("**/api/v1/admin/payments?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: mockPaymentId,
              payerAccountId: "acc-payer-001",
              payeeAccountId: "acc-payee-001",
              amountMinor: 25000,
              feeMinor: 150,
              currency: "USD",
              status: "SETTLED",
              providerReference: "prov-ref-987",
              idempotencyKey: "idem-key-001",
              idempotencyScope: "GLOBAL",
              createdAt: "2026-09-26T10:00:00Z",
              updatedAt: "2026-09-26T10:01:00Z",
            },
          ],
          pageable: {
            pageNumber: 0,
            pageSize: 20,
            offset: 0,
            paged: true,
            unpaged: false,
            sort: { sorted: true, unsorted: false, empty: false },
          },
          totalElements: 1,
          totalPages: 1,
          last: true,
          first: true,
          size: 20,
          number: 0,
          sort: { sorted: true, unsorted: false, empty: false },
          numberOfElements: 1,
          empty: false,
        }),
      });
    });

    // Intercept backend single payment detail API
    await page.route(`**/api/v1/admin/payments/${mockPaymentId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockPaymentId,
          payerAccountId: "acc-payer-001",
          payeeAccountId: "acc-payee-001",
          amountMinor: 25000,
          feeMinor: 150,
          currency: "USD",
          status: "SETTLED",
          providerReference: "prov-ref-987",
          idempotencyKey: "idem-key-001",
          idempotencyScope: "GLOBAL",
          createdAt: "2026-09-26T10:00:00Z",
          updatedAt: "2026-09-26T10:01:00Z",
        }),
      });
    });

    // Seed session token into sessionStorage so AuthProvider triggers session refresh
    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/payments");

    // Verify page header
    const heading = page.locator("h1");
    await expect(heading).toHaveText("Payments");

    // Verify payment row
    const row = page.locator(`[data-testid='payment-row-${mockPaymentId}']`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("$250.00");
    await expect(row).toContainText("Settled");

    // Click "View" to navigate to detail view
    const viewLink = page.locator(`[data-testid='view-payment-link-${mockPaymentId}']`);
    await viewLink.click();

    // Verify URL and detail view
    await expect(page).toHaveURL(`/admin/payments/${mockPaymentId}`);
    const detailHeading = page.locator("h1");
    await expect(detailHeading).toHaveText("Payment Details");

    // Verify authoritative details rendered
    await expect(page.locator("[data-testid='detail-amount-value']")).toHaveText("$250.00");
    await expect(page.locator("[data-testid='detail-fee-value']")).toHaveText("$1.50");
    await expect(page.locator("[data-testid='detail-payer-account-id']")).toHaveText("acc-payer-001");
    await expect(page.locator("[data-testid='detail-payee-account-id']")).toHaveText("acc-payee-001");
    await expect(page.locator("[data-testid='detail-provider-ref']")).toHaveText("prov-ref-987");
  });
});
