import { test, expect } from "@playwright/test";

function createMockToken(role: string = "ADMIN") {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "11111111-1111-1111-1111-111111111111",
      email: `${role.toLowerCase()}@paymentledger.com`,
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString("base64");
  return `${header}.${payload}.mock-signature`;
}

test.describe("Phase F8-B Error Resilience & UX Boundaries E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Default mocks for auth refresh to prevent redirect loops
    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          type: "https://api.paymentledger.com/errors/UNAUTHORIZED",
          title: "Unauthorized",
          status: 401,
          detail: "Session expired",
          errorCode: "UNAUTHORIZED",
          timestamp: new Date().toISOString(),
        }),
      });
    });
  });

  test("displays offline network indicator when browser goes offline and restores when back online", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await expect(page.locator("#login-email")).toBeVisible();

    // Verify indicator is initially hidden
    await expect(page.getByTestId("network-offline-indicator")).not.toBeVisible();

    // Trigger offline event
    await context.setOffline(true);

    // Indicator must appear with accessible copy
    const offlineIndicator = page.getByTestId("network-offline-indicator");
    await expect(offlineIndicator).toBeVisible();
    await expect(
      page.getByText("You appear to be offline. Some actions may be unavailable.")
    ).toBeVisible();

    // Restore online connectivity
    await context.setOffline(false);

    // Restored notification must appear
    const restoredIndicator = page.getByTestId("network-restored-indicator");
    await expect(restoredIndicator).toBeVisible();
    await expect(page.getByText("Connection restored.")).toBeVisible();

    // Manually dismiss
    const dismissBtn = page.getByTestId("network-restored-dismiss");
    await dismissBtn.click();
    await expect(restoredIndicator).not.toBeVisible();
  });

  test("CRITICAL FINANCIAL INVARIANT: returning online does not submit or replay financial mutations", async ({
    page,
    context,
  }) => {
    let paymentMutationCalled = false;
    let payoutMutationCalled = false;
    let refundMutationCalled = false;

    await page.route("**/api/v1/payments", async (route) => {
      paymentMutationCalled = true;
      await route.abort();
    });
    await page.route("**/api/v1/payouts", async (route) => {
      payoutMutationCalled = true;
      await route.abort();
    });
    await page.route("**/api/v1/refunds", async (route) => {
      refundMutationCalled = true;
      await route.abort();
    });

    await page.goto("/login");

    // Toggle network multiple times
    await context.setOffline(true);
    await page.waitForTimeout(200);
    await context.setOffline(false);
    await page.waitForTimeout(200);
    await context.setOffline(true);
    await page.waitForTimeout(200);
    await context.setOffline(false);
    await page.waitForTimeout(200);

    // Assert zero mutations dispatched
    expect(paymentMutationCalled).toBe(false);
    expect(payoutMutationCalled).toBe(false);
    expect(refundMutationCalled).toBe(false);
  });

  test("admin error boundary does not bypass authorization for unauthenticated visitors", async ({
    page,
  }) => {
    // Attempt visiting admin dashboard without session
    await page.goto("/admin/dashboard");

    // Must be redirected to login via ProtectedRoute, never displaying administrative error or data
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fdashboard/);
    await expect(page.getByTestId("admin-error-state")).not.toBeVisible();
    await expect(page.getByTestId("error-boundary-container")).not.toBeVisible();
  });

  test("admin error boundary does not bypass authorization for unauthorized CUSTOMER role", async ({
    page,
  }) => {
    const customerToken = createMockToken("CUSTOMER");

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

    await page.goto("/login?redirect=%2Fadmin%2Fdashboard");

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
    await page.fill("#login-password", "ValidPass123!@#");
    await page.click("button[type='submit']");

    // Customer must be presented with Access Restricted alert, NOT admin content or bypass
    await expect(page.getByTestId("access-restricted-alert")).toBeVisible();
    await expect(page.getByText(/lacks permission to access this view/i)).toBeVisible();
    await expect(page.getByTestId("error-boundary-container")).not.toBeVisible();
  });

  test("existing login and internal redirect functionality remains fully intact", async ({
    page,
  }) => {
    const merchantToken = createMockToken("MERCHANT");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: merchantToken,
          refreshToken: "mock-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: merchantToken,
          refreshToken: "mock-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    await page.goto("/login?redirect=%2Fdashboard");
    await page.fill("#login-email", "merchant@paymentledger.com");
    await page.fill("#login-password", "Password12345!");
    await page.click("button[type='submit']");

    // Successfully redirects to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
