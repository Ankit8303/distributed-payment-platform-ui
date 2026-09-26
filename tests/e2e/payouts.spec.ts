import { test, expect } from "@playwright/test";

test.describe("Phase F5 Payouts E2E Tests", () => {
  const accountId = "11111111-2222-3333-4444-555555555555";
  const payoutId = "99999999-8888-7777-6666-555544443333";

  function createMockToken(role: string) {
    const mockHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
    const mockPayload = Buffer.from(
      JSON.stringify({
        sub: "f1e2d3c4-b5a6-4789-8012-3456789abcde",
        role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64");
    return `${mockHeader}.${mockPayload}.mock-sig`;
  }

  const validMerchantToken = createMockToken("MERCHANT");

  test.beforeEach(async ({ page }) => {
    // Mock login endpoint with MERCHANT role by default
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: validMerchantToken,
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
          accessToken: validMerchantToken,
          refreshToken: "mock-valid-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    // Authenticate as MERCHANT
    await page.goto("/login?redirect=%2Fdashboard");
    await page.fill("#login-email", "merchant@paymentledger.com");
    await page.fill("#login-password", "ValidPass123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("executes Payout flow: Sidebar -> /payouts/new -> Form -> Confirm (NO fees) -> Payout Detail", async ({
    page,
  }) => {
    // Mock POST /api/v1/payouts
    await page.route("**/api/v1/payouts", async (route) => {
      if (route.request().method() === "POST") {
        const headers = route.request().headers();
        expect(headers["idempotency-key"]).toBeDefined();

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            payoutId,
            accountId,
            amountMinor: 100000,
            currency: "USD",
            status: "SETTLED",
            providerReference: "ext_bank_wire_789",
            failureReason: null,
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Mock GET /api/v1/payouts/{payoutId}
    await page.route(`**/api/v1/payouts/${payoutId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          payoutId,
          accountId,
          amountMinor: 100000,
          currency: "USD",
          status: "SETTLED",
          providerReference: "ext_bank_wire_789",
          failureReason: null,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Navigate to Payouts via Sidebar link
    await page.click('nav[aria-label="Customer Navigation"] >> text=Payouts');
    await expect(page).toHaveURL(/\/payouts\/new/);

    // Fill Payout Form
    await page.fill('[data-testid="payout-account-id-input"]', accountId);
    await page.fill('[data-testid="payout-amount-input"]', "1000.00");
    await page.fill('[data-testid="payout-currency-input"]', "USD");

    await page.click('[data-testid="payout-review-button"]');

    // Confirm Dialog checks
    const confirmDialog = page.getByTestId("payout-confirm-dialog");
    await expect(confirmDialog).toBeVisible();
    await expect(page.getByText("$1,000.00")).toBeVisible();
    await expect(page.getByText(accountId)).toBeVisible();

    // Critical Invariant: NO fee details must ever be rendered in payout confirmation
    const dialogText = await confirmDialog.innerText();
    expect(dialogText.toLowerCase()).not.toContain("fee");

    // Click confirm & disburse
    await page.click('[data-testid="payout-confirm-submit-button"]');

    // Verifies navigation to /payouts/{payoutId}
    await expect(page).toHaveURL(new RegExp(`/payouts/${payoutId}`));
    await expect(page.getByTestId("payout-status-card")).toBeVisible();
    await expect(page.getByText("$1,000.00")).toBeVisible();
    await expect(page.getByText("ext_bank_wire_789")).toBeVisible();
  });

  test("blocks CUSTOMER role from accessing payout creation form", async ({ page }) => {
    const customerToken = createMockToken("CUSTOMER");

    // Override auth with CUSTOMER token
    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: customerToken,
          refreshToken: "mock-customer-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    // Re-authenticate as CUSTOMER
    await page.goto("/login?redirect=%2Fpayouts%2Fnew");
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: customerToken,
          refreshToken: "mock-customer-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });
    await page.fill("#login-email", "customer@paymentledger.com");
    await page.fill("#login-password", "ValidPass123!");
    await page.click('button[type="submit"]');

    // Should navigate to /payouts/new and trigger access restriction
    await expect(page).toHaveURL(/\/payouts\/new/);
    await expect(page.getByTestId("access-restricted-alert")).toBeVisible();
    await expect(page.locator('[data-testid="payout-account-id-input"]')).not.toBeVisible();
  });

  test("allows ADMIN role to access payout creation form", async ({ page }) => {
    const adminToken = createMockToken("ADMIN");

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: adminToken,
          refreshToken: "mock-admin-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    await page.goto("/login?redirect=%2Fpayouts%2Fnew");
    await page.fill("#login-email", "admin@paymentledger.com");
    await page.fill("#login-password", "ValidPass123!");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/payouts\/new/);
    await expect(page.locator('[data-testid="payout-account-id-input"]')).toBeVisible();
    await expect(page.getByTestId("access-restricted-alert")).not.toBeVisible();
  });

  test("allows SYSTEM role to access payout creation form", async ({ page }) => {
    const systemToken = createMockToken("SYSTEM");

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: systemToken,
          refreshToken: "mock-system-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    await page.goto("/login?redirect=%2Fpayouts%2Fnew");
    await page.fill("#login-email", "system@paymentledger.com");
    await page.fill("#login-password", "ValidPass123!");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/payouts\/new/);
    await expect(page.locator('[data-testid="payout-account-id-input"]')).toBeVisible();
    await expect(page.getByTestId("access-restricted-alert")).not.toBeVisible();
  });
});

test.describe("Phase F8-A Payout Unauthenticated Guard", () => {
  test("redirects unauthenticated user from /payouts/new to login with redirect parameter", async ({ page }) => {
    await page.goto("/payouts/new");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpayouts%2Fnew/);
  });
});

