import { test, expect } from "@playwright/test";

test.describe("Phase F7-C Admin Dashboard E2E Tests", () => {
  test("redirects unauthenticated visitor from /admin/dashboard to /login", async ({
    page,
  }) => {
    await page.goto("/admin/dashboard");
    // ProtectedRoute redirects unauthenticated users
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fdashboard/);
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("loads admin dashboard with mocked summary metrics for ADMIN user", async ({
    page,
  }) => {
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

    // Intercept backend dashboard summary API
    await page.route("**/api/v1/admin/dashboard/summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalUsers: 1420,
          totalAccounts: 2850,
          activeAccounts: 2835,
          frozenAccounts: 15,
          totalPayments: 95400,
          settledPayments: 94250,
          failedPayments: 850,
          pendingReconciliationPayments: 300,
          openReconciliationCases: 4,
          totalNotifications: 112000,
        }),
      });
    });

    // Seed session token into sessionStorage so AuthProvider triggers session refresh
    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/dashboard");

    // Verify page header
    const heading = page.locator("h1");
    await expect(heading).toHaveText("Dashboard");

    // Verify KPI metrics display authoritative numbers
    await expect(page.locator("[data-testid='kpi-total-users-value']")).toHaveText("1,420");
    await expect(page.locator("[data-testid='kpi-total-accounts-value']")).toHaveText("2,850");
    await expect(page.locator("[data-testid='kpi-active-accounts-value']")).toHaveText("2,835");
    await expect(page.locator("[data-testid='kpi-frozen-accounts-value']")).toHaveText("15");

    await expect(page.locator("[data-testid='kpi-total-payments-value']")).toHaveText("95,400");
    await expect(page.locator("[data-testid='kpi-settled-payments-value']")).toHaveText("94,250");
    await expect(page.locator("[data-testid='kpi-failed-payments-value']")).toHaveText("850");
    await expect(page.locator("[data-testid='kpi-pending-reconciliation-value']")).toHaveText("300");

    await expect(page.locator("[data-testid='kpi-open-reconciliation-cases-value']")).toHaveText("4");
    await expect(page.locator("[data-testid='kpi-total-notifications-value']")).toHaveText("112,000");

    // Verify Refresh button
    const refreshBtn = page.locator("[data-testid='admin-dashboard-refresh-button']");
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // Verify dashboard remains stable and functional
    await expect(page.locator("[data-testid='kpi-total-users-value']")).toHaveText("1,420");
  });
});
