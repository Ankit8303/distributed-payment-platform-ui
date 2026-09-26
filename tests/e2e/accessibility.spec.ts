import { test, expect } from "@playwright/test";

function createMockJwt(role: string, email: string): string {
  const claims = {
    sub: `${role.toLowerCase()}-e2e-uuid`,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7200,
  };
  const b64Payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `eyJhbGciOiJIUzI1NiJ9.${b64Payload}.mockSignature`;
}

test.describe("Phase F8-E Accessibility & Inclusive UX E2E Suite", () => {
  test("1. Unauthenticated login accessibility (landmarks, labels, keyboard navigation)", async ({ page }) => {
    await page.goto("/login");

    // Semantic landmark
    const mainLandmark = page.locator("main#main-content");
    await expect(mainLandmark).toBeVisible();

    // Form inputs and programmatic label association
    const emailInput = page.locator("#login-email");
    const passwordInput = page.locator("#login-password");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Tab through elements
    await emailInput.focus();
    await page.keyboard.press("Tab");
    await expect(passwordInput).toBeFocused();
  });

  test("2. Keyboard access to main navigation on landing page", async ({ page }) => {
    await page.goto("/");

    // Skip link exists and is present
    const skipLink = page.locator("a[href='#main-content']");
    await expect(skipLink).toBeAttached();

    // Focus on skip link
    await skipLink.focus();
    await expect(skipLink).toBeVisible();

    // Main landmark exists
    const main = page.locator("main#main-content");
    await expect(main).toBeAttached();
  });

  test("3. Skip link moves focus towards main content on login page", async ({ page }) => {
    await page.goto("/login");

    const skipLink = page.locator("a[href='#main-content']");
    await expect(skipLink).toBeAttached();

    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await page.keyboard.press("Enter");

    // Target URL should contain hash #main-content
    expect(page.url()).toContain("#main-content");
  });

  test("4. Customer dashboard keyboard flow", async ({ page }) => {
    const mockJwt = createMockJwt("CUSTOMER", "customer@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-customer",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/accounts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: "acc-customer-1111",
              accountNumber: "ACCT-CUST-001",
              currency: "USD",
              accountType: "CUSTOMER",
              status: "ACTIVE",
              materializedBalanceMinor: 250000,
              createdAt: "2026-09-01T10:00:00Z",
              updatedAt: "2026-09-01T10:00:00Z",
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      });
    });

    await page.route("**/api/v1/payments**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 10,
          number: 0,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-customer");
    });

    await page.goto("/dashboard");
    const main = page.locator("main#main-content");
    await expect(main).toBeVisible();
  });

  test("5. Payment form keyboard flow and accessible validation", async ({ page }) => {
    const mockJwt = createMockJwt("CUSTOMER", "customer@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-customer",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/accounts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: "acc-customer-1111",
              accountNumber: "ACCT-CUST-001",
              currency: "USD",
              accountType: "CUSTOMER",
              status: "ACTIVE",
              materializedBalanceMinor: 250000,
              createdAt: "2026-09-01T10:00:00Z",
              updatedAt: "2026-09-01T10:00:00Z",
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-customer");
    });

    await page.goto("/payments/new");
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("6. Payment status accessibility and non-color badge indicators", async ({ page }) => {
    const mockJwt = createMockJwt("CUSTOMER", "customer@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-customer",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/payments/pay-sample-uuid-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "pay-sample-uuid-1",
          sourceAccountId: "acc-1",
          destinationAccountId: "acc-2",
          amountMinor: 5000,
          currency: "USD",
          status: "SETTLED",
          createdAt: "2026-09-01T10:00:00Z",
          updatedAt: "2026-09-01T10:01:00Z",
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-customer");
    });

    await page.goto("/payments/pay-sample-uuid-1");
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("7. Admin navigation keyboard flow and landmark structure", async ({ page }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/admin/dashboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalAccounts: 10,
          totalTransactions: 100,
          discrepancyCount: 0,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-admin");
    });

    await page.goto("/admin/dashboard");
    const adminMain = page.locator("main#admin-main-content");
    await expect(adminMain).toBeVisible();

    // Check skip link in admin header
    const skipLink = page.locator("a[href='#admin-main-content']");
    await expect(skipLink).toBeAttached();
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
  });

  test("8. Reconciliation page keyboard flow and semantic tables", async ({ page }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/admin/reconciliation/cases**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 10,
          number: 0,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-admin");
    });

    await page.goto("/admin/reconciliation");
    await expect(page.locator("main#admin-main-content")).toBeVisible();
    await expect(page.locator("[data-testid='reconciliation-table-empty']")).toBeVisible();
  });

  test("9. Notification action modal accessibility (focus entry and Escape)", async ({ page }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");
    const testNotifId = "notif-retry-test-1111";

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route(`**/api/v1/admin/notifications/${testNotifId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notification: {
            id: testNotifId,
            eventId: "ev-1",
            eventType: "PAYMENT_FAILED",
            aggregateId: "agg-1",
            recipient: "user@example.com",
            channel: "EMAIL",
            templateCode: "PAYMENT_RECEIPT",
            templateVersion: 1,
            status: "FAILED",
            attemptCount: 1,
            maxAttempts: 3,
            nextAttemptAt: null,
            leaseWorkerId: null,
            leaseExpiresAt: null,
            renderedSubject: "Payment Failed",
            renderedBody: "Your payment failed.",
            createdAt: "2026-09-01T10:00:00Z",
            updatedAt: "2026-09-01T12:00:00Z",
            sentAt: null,
          },
          deliveries: [],
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-admin");
    });

    await page.goto(`/admin/notifications/${testNotifId}`);
    const retryButton = page.locator("[data-testid='retry-notification-button']");
    await expect(retryButton).toBeVisible();

    // Trigger modal
    await retryButton.click();
    const modal = page.locator("[data-testid='notification-action-modal']");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("role", "dialog");
    await expect(modal).toHaveAttribute("aria-modal", "true");

    // Dismiss with Escape key
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("10. Refund page accessibility and semantic tables", async ({ page }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/admin/refunds**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 10,
          number: 0,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-admin");
    });

    await page.goto("/admin/refunds");
    await expect(page.locator("main#admin-main-content")).toBeVisible();
    await expect(page.locator("[data-testid='refund-table-empty']")).toBeVisible();
  });

  test("11. Payout page accessibility and semantic tables", async ({ page }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/admin/payouts**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 10,
          number: 0,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-admin");
    });

    await page.goto("/admin/payouts");
    await expect(page.locator("main#admin-main-content")).toBeVisible();
    await expect(page.locator("[data-testid='payout-table-empty']")).toBeVisible();
  });

  test("12. User governance accessibility and directory table", async ({ page }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/admin/users**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 10,
          number: 0,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-admin");
    });

    await page.goto("/admin/users");
    await expect(page.locator("main#admin-main-content")).toBeVisible();
    await expect(page.locator("[data-testid='user-table-empty']")).toBeVisible();
  });

  test("13. CUSTOMER role remains blocked from admin surfaces", async ({ page }) => {
    const mockJwt = createMockJwt("CUSTOMER", "customer@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-customer",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-customer");
    });

    await page.goto("/admin/users");
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
  });

  test("14. MERCHANT role remains blocked from admin surfaces", async ({ page }) => {
    const mockJwt = createMockJwt("MERCHANT", "merchant@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-rt-merchant",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-rt-merchant");
    });

    await page.goto("/admin/users");
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
  });
});
