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

test.describe("Phase F8-D Admin Governance, Notifications, Refunds & Payouts E2E Tests", () => {
  const mockUserId = "usr-1111-2222-3333-444444444444";
  const mockNotificationId = "notif-1111-2222-3333-444444444444";
  const mockRefundId = "ref-1111-2222-3333-444444444444";
  const mockPayoutId = "po-1111-2222-3333-444444444444";
  const mockPaymentId = "pay-aaaa-bbbb-cccc-dddddddddddd";
  const mockAccountId = "acc-aaaa-bbbb-cccc-dddddddddddd";

  test("1. Unauthenticated visitor is redirected from /admin/users to /login", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fusers/);
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("2. CUSTOMER role is denied access to admin governance surfaces", async ({
    page,
  }) => {
    const mockJwt = createMockJwt("CUSTOMER", "customer@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-refresh-token-customer",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    let adminApiCalled = false;
    await page.route("**/api/v1/admin/**", async (route) => {
      adminApiCalled = true;
      await route.abort();
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-customer");
    });

    await page.goto("/admin/users");
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
    expect(adminApiCalled).toBe(false);

    await page.goto("/admin/notifications");
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();

    await page.goto("/admin/refunds");
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();

    await page.goto("/admin/payouts");
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
  });

  test("3. MERCHANT role is denied access to admin governance surfaces", async ({
    page,
  }) => {
    const mockJwt = createMockJwt("MERCHANT", "merchant@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-refresh-token-merchant",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-merchant");
    });

    await page.goto("/admin/users");
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
  });

  test("4. ADMIN access to User Governance: lists users and navigates to detail", async ({
    page,
  }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

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

    await page.route(/\/api\/v1\/admin\/users/, async (route) => {
      const url = route.request().url();
      if (url.includes(`/api/v1/admin/users/${mockUserId}`)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: mockUserId,
            email: "target-user@corp.internal",
            role: "ADMIN",
            status: "ACTIVE",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: mockUserId,
              email: "target-user@corp.internal",
              role: "ADMIN",
              status: "ACTIVE",
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          number: 0,
          first: true,
          last: true,
          empty: false,
          numberOfElements: 1,
          pageable: {
            pageNumber: 0,
            pageSize: 20,
            offset: 0,
            paged: true,
            unpaged: false,
            sort: { sorted: true, unsorted: false, empty: false },
          },
          sort: { sorted: true, unsorted: false, empty: false },
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/users");
    await expect(page.locator("[data-testid='user-governance-heading']")).toBeVisible();
    await expect(page.getByText("target-user@corp.internal")).toBeVisible();

    // Click inspect link
    await page.locator(`[data-testid='view-user-${mockUserId}-link']`).click();
    await expect(page).toHaveURL(`/admin/users/${mockUserId}`);
    await expect(page.locator("[data-testid='user-detail-email']")).toContainText("target-user@corp.internal");
    await expect(page.locator("[data-testid='user-detail-id']")).toContainText(mockUserId);
  });

  test("5. ADMIN access to Notifications: inspect list, run worker sweep, inspect detail, retry mutation", async ({
    page,
  }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

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

    let runWorkerCalls = 0;
    let retryCalls = 0;

    await page.route(/\/api\/v1\/admin\/notifications/, async (route) => {
      const url = route.request().url();

      if (url.includes("/run-worker")) {
        runWorkerCalls++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(5),
        });
        return;
      }

      if (url.includes(`/${mockNotificationId}/retry`)) {
        retryCalls++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: mockNotificationId,
            eventId: "ev-1",
            eventType: "PAYMENT_CONFIRMATION",
            aggregateId: "agg-1",
            recipient: "user@example.com",
            channel: "EMAIL",
            templateCode: "PAYMENT_RECEIPT",
            templateVersion: 1,
            status: "PENDING",
            attemptCount: 1,
            maxAttempts: 3,
            nextAttemptAt: null,
            leaseWorkerId: null,
            leaseExpiresAt: null,
            renderedSubject: "Payment Receipt",
            renderedBody: "Your payment was confirmed.",
            createdAt: "2026-02-01T00:00:00Z",
            updatedAt: "2026-02-01T00:10:00Z",
            sentAt: null,
          }),
        });
        return;
      }

      if (url.includes(`/api/v1/admin/notifications/${mockNotificationId}`)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notification: {
              id: mockNotificationId,
              eventId: "ev-1",
              eventType: "PAYMENT_CONFIRMATION",
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
              renderedSubject: "Payment Receipt",
              renderedBody: "Your payment was confirmed.",
              createdAt: "2026-02-01T00:00:00Z",
              updatedAt: "2026-02-01T00:05:00Z",
              sentAt: null,
            },
            deliveries: [
              {
                id: "del-1",
                notificationId: mockNotificationId,
                attemptNumber: 1,
                workerId: "worker-01",
                channel: "EMAIL",
                status: "FAILED",
                providerStatus: "SMTP_CONNECT_FAILED",
                httpStatusCode: null,
                errorMessage: "SMTP timeout",
                createdAt: "2026-02-01T00:01:00Z",
              },
            ],
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: mockNotificationId,
              eventId: "ev-1",
              eventType: "PAYMENT_CONFIRMATION",
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
              renderedSubject: "Payment Receipt",
              renderedBody: "Your payment was confirmed.",
              createdAt: "2026-02-01T00:00:00Z",
              updatedAt: "2026-02-01T00:05:00Z",
              sentAt: null,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          number: 0,
          first: true,
          last: true,
          empty: false,
          numberOfElements: 1,
          pageable: {
            pageNumber: 0,
            pageSize: 20,
            offset: 0,
            paged: true,
            unpaged: false,
            sort: { sorted: true, unsorted: false, empty: false },
          },
          sort: { sorted: true, unsorted: false, empty: false },
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    // 1. Visit directory
    await page.goto("/admin/notifications");
    await expect(page.locator("[data-testid='notifications-heading']")).toBeVisible();
    await expect(page.getByText("PAYMENT_CONFIRMATION")).toBeVisible();

    // 2. Trigger run worker sweep modal
    await page.locator("[data-testid='run-notification-worker-button']").click();
    await expect(page.locator("[data-testid='notification-action-modal']")).toBeVisible();
    await page.locator("[data-testid='notification-modal-confirm-button']").click();

    await expect(page.locator("[data-testid='notification-worker-success-banner']")).toBeVisible();
    expect(runWorkerCalls).toBe(1);

    // 3. Inspect detail
    await page.locator(`[data-testid='view-notification-${mockNotificationId}-link']`).click();
    await expect(page).toHaveURL(`/admin/notifications/${mockNotificationId}`);
    await expect(page.locator("[data-testid='notification-detail-id']")).toContainText(mockNotificationId);
    await expect(page.getByText("SMTP timeout")).toBeVisible();

    // 4. Retry mutation
    await page.locator("[data-testid='retry-notification-button']").click();
    await expect(page.locator("[data-testid='notification-action-modal']")).toBeVisible();
    await page.locator("[data-testid='notification-modal-confirm-button']").click();

    await expect(page.locator("[data-testid='notification-retry-success-banner']")).toBeVisible();
    expect(retryCalls).toBe(1);
  });

  test("6. ADMIN access to Refunds: directory renders formatted amounts, navigates to detail", async ({
    page,
  }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

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

    await page.route(/\/api\/v1\/admin\/refunds/, async (route) => {
      const url = route.request().url();
      if (url.includes(`/api/v1/admin/refunds/${mockRefundId}`)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: mockRefundId,
            paymentId: mockPaymentId,
            amountMinor: 25000, // $250.00
            currency: "USD",
            status: "SETTLED",
            reason: "Damaged packaging",
            providerReference: "ch_prov_refund_99",
            createdAt: "2026-02-01T00:00:00Z",
            updatedAt: "2026-02-01T00:05:00Z",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: mockRefundId,
              paymentId: mockPaymentId,
              amountMinor: 25000,
              currency: "USD",
              status: "SETTLED",
              reason: "Damaged packaging",
              providerReference: "ch_prov_refund_99",
              createdAt: "2026-02-01T00:00:00Z",
              updatedAt: "2026-02-01T00:05:00Z",
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          number: 0,
          first: true,
          last: true,
          empty: false,
          numberOfElements: 1,
          pageable: {
            pageNumber: 0,
            pageSize: 20,
            offset: 0,
            paged: true,
            unpaged: false,
            sort: { sorted: true, unsorted: false, empty: false },
          },
          sort: { sorted: true, unsorted: false, empty: false },
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/refunds");
    await expect(page.locator("[data-testid='admin-refunds-heading']")).toBeVisible();
    await expect(page.getByText("$250.00")).toBeVisible();

    await page.locator(`[data-testid='view-refund-${mockRefundId}-link']`).click();
    await expect(page).toHaveURL(`/admin/refunds/${mockRefundId}`);
    await expect(page.locator("[data-testid='refund-detail-amount']")).toContainText("$250.00");
    await expect(page.locator("[data-testid='refund-payment-trace-link']")).toBeVisible();
  });

  test("7. ADMIN access to Payouts: directory renders formatted amounts, navigates to detail", async ({
    page,
  }) => {
    const mockJwt = createMockJwt("ADMIN", "admin@platform.local");

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

    await page.route(/\/api\/v1\/admin\/payouts/, async (route) => {
      const url = route.request().url();
      if (url.includes(`/api/v1/admin/payouts/${mockPayoutId}`)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: mockPayoutId,
            accountId: mockAccountId,
            amountMinor: 890050, // $8,900.50
            currency: "USD",
            status: "SETTLED",
            providerReference: "ach_payout_wire_101",
            createdAt: "2026-02-01T00:00:00Z",
            updatedAt: "2026-02-01T00:05:00Z",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: mockPayoutId,
              accountId: mockAccountId,
              amountMinor: 890050,
              currency: "USD",
              status: "SETTLED",
              providerReference: "ach_payout_wire_101",
              createdAt: "2026-02-01T00:00:00Z",
              updatedAt: "2026-02-01T00:05:00Z",
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          number: 0,
          first: true,
          last: true,
          empty: false,
          numberOfElements: 1,
          pageable: {
            pageNumber: 0,
            pageSize: 20,
            offset: 0,
            paged: true,
            unpaged: false,
            sort: { sorted: true, unsorted: false, empty: false },
          },
          sort: { sorted: true, unsorted: false, empty: false },
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/payouts");
    await expect(page.locator("[data-testid='admin-payouts-heading']")).toBeVisible();
    await expect(page.getByText("$8,900.50")).toBeVisible();

    await page.locator(`[data-testid='view-payout-${mockPayoutId}-link']`).click();
    await expect(page).toHaveURL(`/admin/payouts/${mockPayoutId}`);
    await expect(page.locator("[data-testid='payout-detail-amount']")).toContainText("$8,900.50");
    await expect(page.locator("[data-testid='payout-account-link']")).toBeVisible();
  });
});
