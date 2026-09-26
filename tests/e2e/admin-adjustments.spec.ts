import { test, expect } from "@playwright/test";

function createMockJwt(role: "ADMIN" | "SYSTEM" | "CUSTOMER" | "MERCHANT") {
  const claims = {
    sub: `${role.toLowerCase()}-e2e-uuid`,
    email: `${role.toLowerCase()}@platform.local`,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7200,
  };
  const b64Payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `eyJhbGciOiJIUzI1NiJ9.${b64Payload}.mockSignature`;
}

test.describe("Phase F7-H-B Admin Financial Adjustments E2E Tests", () => {
  test("redirects unauthenticated visitor from /admin/adjustments to /login", async ({
    page,
  }) => {
    await page.goto("/admin/adjustments");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fadjustments/);
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("blocks CUSTOMER user from accessing /admin/adjustments", async ({ page }) => {
    const customerJwt = createMockJwt("CUSTOMER");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: customerJwt,
          refreshToken: "mock-refresh-token-customer",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-customer");
    });

    await page.goto("/admin/adjustments");

    // Customer should see access restricted alert and form must not be visible
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
    await expect(page.locator("#adjustment-form")).not.toBeVisible();
  });

  test("blocks MERCHANT user from accessing /admin/adjustments", async ({ page }) => {
    const merchantJwt = createMockJwt("MERCHANT");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: merchantJwt,
          refreshToken: "mock-refresh-token-merchant",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-merchant");
    });

    await page.goto("/admin/adjustments");

    // Merchant should see access restricted alert and form must not be visible
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
    await expect(page.locator("#adjustment-form")).not.toBeVisible();
  });

  test("loads financial adjustments workspace and validates form for ADMIN user without calling mutation", async ({
    page,
  }) => {
    const adminJwt = createMockJwt("ADMIN");

    // Track calls to adjustment creation mutation
    let mutationCalled = false;
    await page.route("**/api/v1/admin/adjustments", async (route) => {
      if (route.request().method() === "POST") {
        mutationCalled = true;
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ title: "SHOULD NOT BE CALLED" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: adminJwt,
          refreshToken: "mock-refresh-token-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    const mockAccount1 = {
      id: "11111111-1111-4111-8111-111111111111",
      accountNumber: "ACC-E2E-001",
      ownerId: "usr-e2e-owner-1",
      accountType: "CUSTOMER",
      currency: "USD",
      status: "ACTIVE",
      materializedBalanceMinor: 250000,
      version: 1,
      createdAt: "2026-09-26T10:00:00Z",
      updatedAt: "2026-09-26T10:00:00Z",
    };

    const mockAccount2 = {
      id: "22222222-2222-4222-8222-222222222222",
      accountNumber: "ACC-E2E-002",
      ownerId: "usr-e2e-owner-2",
      accountType: "MERCHANT",
      currency: "USD",
      status: "ACTIVE",
      materializedBalanceMinor: 75000,
      version: 1,
      createdAt: "2026-09-26T10:00:00Z",
      updatedAt: "2026-09-26T10:00:00Z",
    };

    await page.route("**/api/v1/admin/accounts?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [mockAccount1, mockAccount2],
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
          first: true,
          last: true,
        }),
      });
    });

    await page.route("**/api/v1/admin/accounts/11111111-1111-4111-8111-111111111111", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAccount1),
      });
    });

    await page.route("**/api/v1/admin/accounts/22222222-2222-4222-8222-222222222222", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAccount2),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/adjustments");

    // Workspace rendered
    await expect(page.locator("h1")).toHaveText("Financial Adjustments");
    await expect(page.locator("#adjustment-form")).toBeVisible();

    // Verify Warning Notice
    await expect(page.getByText(/Administrative Financial Adjustment Workspace/i)).toBeVisible();

    // 1. Submit empty form to trigger validation
    await page.click("button:has-text('Continue to Review')");
    await expect(page.getByText(/Source account is required/i)).toBeVisible();
    await expect(page.getByText(/Target account is required/i)).toBeVisible();
    await expect(page.getByText(/Amount is required/i)).toBeVisible();

    // 2. Select Source and Target accounts
    await page.getByRole("combobox", { name: "Source Account Selection" }).selectOption(mockAccount1.id);
    await expect(page.locator("[data-testid='source-account-card']")).toBeVisible();
    await expect(page.locator("[data-testid='source-account-card']")).toContainText("ACC-E2E-001");

    await page.getByRole("combobox", { name: "Target Account Selection" }).selectOption(mockAccount2.id);
    await expect(page.locator("[data-testid='target-account-card']")).toBeVisible();
    await expect(page.locator("[data-testid='target-account-card']")).toContainText("ACC-E2E-002");

    // 3. Test same source and target validation
    await page.getByRole("combobox", { name: "Target Account Selection" }).selectOption(mockAccount1.id);
    await page.click("button:has-text('Continue to Review')");
    await expect(page.getByText(/Source account and target account must not be the same account/i)).toBeVisible();

    // Reset target to mockAccount2
    await page.getByRole("combobox", { name: "Target Account Selection" }).selectOption(mockAccount2.id);

    // 4. Fill amount and audit reason
    await page.getByLabel(/Amount \(USD\)/i).fill("150.75");
    await page.getByLabel(/Audit Reason/i).fill("E2E automated reconciliation test adjustment");

    // 5. Submit to "Continue to Review"
    await page.click("button:has-text('Continue to Review')");

    // Verify prepared review card appears
    await expect(page.locator("[data-testid='prepared-payload-card']")).toBeVisible();
    await expect(page.locator("[data-testid='prepared-payload-card']")).toContainText("Prepared Adjustment Payload (Ready for Review)");
    await expect(page.locator("[data-testid='prepared-payload-card']")).toContainText("15075");
    await expect(page.locator("[data-testid='prepared-payload-card']")).toContainText("USD");

    // 6. Modal opened automatically on Continue to Review
    await expect(page.locator("[data-testid='adjustment-confirm-dialog']")).toBeVisible();
    await expect(page.locator("[data-testid='modal-amount-display']")).toContainText("$150.75");

    // Close modal via Cancel button and confirm mutation was not dispatched
    await page.click("button:has-text('Cancel / Back to Form')");
    await expect(page.locator("[data-testid='adjustment-confirm-dialog']")).not.toBeVisible();
    expect(mutationCalled).toBe(false);
  });

  test("executes financial mutation upon explicit confirmation with idempotency key and renders authoritative success banner", async ({
    page,
  }) => {
    const adminJwt = createMockJwt("ADMIN");

    let receivedIdempotencyKey: string | null = null;
    let receivedPayload: any = null;

    const mockAccount1 = {
      id: "11111111-1111-4111-8111-111111111111",
      accountNumber: "ACC-E2E-001",
      ownerId: "usr-e2e-owner-1",
      accountType: "CUSTOMER",
      currency: "USD",
      status: "ACTIVE",
      materializedBalanceMinor: 250000,
      version: 1,
      createdAt: "2026-09-26T10:00:00Z",
      updatedAt: "2026-09-26T10:00:00Z",
    };

    const mockAccount2 = {
      id: "22222222-2222-4222-8222-222222222222",
      accountNumber: "ACC-E2E-002",
      ownerId: "usr-e2e-owner-2",
      accountType: "MERCHANT",
      currency: "USD",
      status: "ACTIVE",
      materializedBalanceMinor: 75000,
      version: 1,
      createdAt: "2026-09-26T10:00:00Z",
      updatedAt: "2026-09-26T10:00:00Z",
    };

    const mockSuccessResponse = {
      adjustmentId: "99999999-9999-4999-8999-999999999999",
      sourceAccountId: mockAccount1.id,
      targetAccountId: mockAccount2.id,
      amountMinor: 50000,
      currency: "USD",
      reason: "Quarterly operational correction",
      operatorId: "admin-e2e-uuid",
      compensatingLedgerTransactionId: "88888888-8888-4888-8888-888888888888",
      createdAt: "2026-09-26T12:00:00Z",
    };

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: adminJwt,
          refreshToken: "mock-refresh-token-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/admin/accounts?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [mockAccount1, mockAccount2],
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
          first: true,
          last: true,
        }),
      });
    });

    await page.route(`**/api/v1/admin/accounts/${mockAccount1.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAccount1),
      });
    });

    await page.route(`**/api/v1/admin/accounts/${mockAccount2.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAccount2),
      });
    });

    // Intercept POST /api/v1/admin/adjustments
    await page.route("**/api/v1/admin/adjustments", async (route) => {
      if (route.request().method() === "POST") {
        receivedIdempotencyKey = route.request().headers()["idempotency-key"] || null;
        receivedPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(mockSuccessResponse),
        });
      } else {
        await route.continue();
      }
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/adjustments");

    // Fill form
    await page.getByRole("combobox", { name: "Source Account Selection" }).selectOption(mockAccount1.id);
    await page.getByRole("combobox", { name: "Target Account Selection" }).selectOption(mockAccount2.id);
    await page.getByLabel(/Amount \(USD\)/i).fill("500.00");
    await page.getByLabel(/Audit Reason/i).fill("Quarterly operational correction");

    // Click Continue to Review
    await page.click("button:has-text('Continue to Review')");

    // Modal dialog is displayed
    await expect(page.locator("[data-testid='adjustment-confirm-dialog']")).toBeVisible();

    // Confirm & Post Adjustment
    await page.click("[data-testid='confirm-post-adjustment-button']");

    // Verify modal closes and authoritative success banner appears
    await expect(page.locator("[data-testid='adjustment-confirm-dialog']")).not.toBeVisible();
    await expect(page.locator("[data-testid='adjustment-success-banner']")).toBeVisible();
    await expect(page.locator("[data-testid='success-adjustment-id']")).toHaveText(
      mockSuccessResponse.adjustmentId
    );
    await expect(page.locator("[data-testid='success-ledger-tx-id']")).toHaveText(
      mockSuccessResponse.compensatingLedgerTransactionId
    );
    await expect(page.locator("[data-testid='success-amount']")).toContainText("$500.00");

    // Verify Idempotency-Key header was sent and valid UUID
    expect(receivedIdempotencyKey).toBeTruthy();
    expect(receivedIdempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    // Verify exact payload transmitted
    expect(receivedPayload).toEqual({
      sourceAccountId: mockAccount1.id,
      targetAccountId: mockAccount2.id,
      amountMinor: 50000,
      currency: "USD",
      reason: "Quarterly operational correction",
    });
  });
});

test.describe("Phase F7-H-D Admin Financial Adjustment Detail E2E Tests", () => {
  const detailAdjustmentId = "77777777-7777-4777-8777-777777777777";
  const sourceAccountId = "11111111-1111-4111-8111-111111111111";
  const targetAccountId = "22222222-2222-4222-8222-222222222222";
  const ledgerTxId = "88888888-8888-4888-8888-888888888888";

  const mockDetailAdjustment = {
    adjustmentId: detailAdjustmentId,
    sourceAccountId,
    targetAccountId,
    amountMinor: 125050,
    currency: "USD",
    reason: "Authoritative reconciliation of misrouted payment #PAY-9921",
    operatorId: "usr-admin-e2e-operator",
    compensatingLedgerTransactionId: ledgerTxId,
    createdAt: "2026-09-26T16:00:00Z",
  };

  test("blocks unauthenticated visitor from accessing /admin/adjustments/[id]", async ({
    page,
  }) => {
    await page.goto(`/admin/adjustments/${detailAdjustmentId}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=%2Fadmin%2Fadjustments%2F${detailAdjustmentId}`));
  });

  test("blocks CUSTOMER user from accessing /admin/adjustments/[id]", async ({ page }) => {
    const customerJwt = createMockJwt("CUSTOMER");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: customerJwt,
          refreshToken: "mock-refresh-token-customer",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-customer");
    });

    await page.goto(`/admin/adjustments/${detailAdjustmentId}`);
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
    await expect(page.locator("[data-testid='admin-adjustment-detail-page']")).not.toBeVisible();
  });

  test("blocks MERCHANT user from accessing /admin/adjustments/[id]", async ({ page }) => {
    const merchantJwt = createMockJwt("MERCHANT");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: merchantJwt,
          refreshToken: "mock-refresh-token-merchant",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-merchant");
    });

    await page.goto(`/admin/adjustments/${detailAdjustmentId}`);
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
    await expect(page.locator("[data-testid='admin-adjustment-detail-page']")).not.toBeVisible();
  });

  test("ADMIN can view authoritative adjustment details, verify read-only immutability, and inspect navigation links", async ({
    page,
  }) => {
    const adminJwt = createMockJwt("ADMIN");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: adminJwt,
          refreshToken: "mock-refresh-token-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route(`**/api/v1/admin/adjustments/${detailAdjustmentId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDetailAdjustment),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto(`/admin/adjustments/${detailAdjustmentId}`);

    // Verify detail container and title
    await expect(page.locator("[data-testid='admin-adjustment-detail-page']")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Financial Adjustment Detail");
    await expect(page.locator("[data-testid='adjustment-status-badge']")).toContainText("Adjustment Posted");

    // Authoritative identifiers & metadata
    await expect(page.locator("[data-testid='detail-adjustment-id']")).toHaveText(detailAdjustmentId);
    await expect(page.locator("[data-testid='detail-operator-id']")).toHaveText(mockDetailAdjustment.operatorId);
    await expect(page.locator("[data-testid='detail-formatted-amount']")).toHaveText("$1,250.50");
    await expect(page.locator("[data-testid='detail-minor-units']")).toHaveText("125050 integer minor units");
    await expect(page.locator("[data-testid='detail-audit-reason']")).toHaveText(mockDetailAdjustment.reason);

    // Verify navigation links have correct authoritative target URLs
    const sourceLink = page.locator("[data-testid='source-account-link']");
    await expect(sourceLink).toHaveAttribute("href", `/admin/accounts/${sourceAccountId}`);

    const targetLink = page.locator("[data-testid='target-account-link']");
    await expect(targetLink).toHaveAttribute("href", `/admin/accounts/${targetAccountId}`);

    const ledgerLink = page.locator("[data-testid='view-ledger-transaction-link']");
    await expect(ledgerLink).toHaveAttribute("href", `/admin/ledger/transactions/${ledgerTxId}`);

    // Verify STRICT READ-ONLY IMMUTABILITY: No edit/delete/cancel/reverse/repost buttons
    await expect(page.getByRole("button", { name: /Edit/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Delete/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Cancel/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Reverse/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Refund/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Repost|Retry Posting/i })).not.toBeVisible();
  });

  test("displays authoritative 404 state when adjustment is nonexistent", async ({
    page,
  }) => {
    const adminJwt = createMockJwt("ADMIN");
    const nonexistentId = "00000000-0000-4000-8000-000000000000";

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: adminJwt,
          refreshToken: "mock-refresh-token-admin",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route(`**/api/v1/admin/adjustments/${nonexistentId}`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/problem+json",
        body: JSON.stringify({
          title: "Not Found",
          status: 404,
          detail: `Adjustment ${nonexistentId} not found`,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto(`/admin/adjustments/${nonexistentId}`);

    await expect(page.locator("[data-testid='admin-adjustment-not-found']")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Adjustment Not Found" })).toBeVisible();

    // Verify back navigation link
    const backLink = page.locator("[data-testid='not-found-back-button']");
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/admin/adjustments");
  });
});

