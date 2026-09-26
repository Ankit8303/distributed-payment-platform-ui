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

test.describe("Phase F8-C Admin Reconciliation Operations E2E Tests", () => {
  const mockCaseId = "rec-case-1111-2222-3333-444444444444";
  const mockPaymentId = "pay-aaaa-bbbb-cccc-dddddddddddd";

  test("1. Unauthenticated visitor is redirected from /admin/reconciliation to /login", async ({
    page,
  }) => {
    await page.goto("/admin/reconciliation");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Freconciliation/);
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("2. CUSTOMER role is denied access to reconciliation workspace", async ({
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

    let reconciliationApiCalled = false;
    await page.route("**/api/v1/admin/reconciliation/**", async (route) => {
      reconciliationApiCalled = true;
      await route.abort();
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-customer");
    });

    await page.goto("/admin/reconciliation");

    // Must see Access Restricted alert
    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
    expect(reconciliationApiCalled).toBe(false);
  });

  test("3. MERCHANT role is denied access to reconciliation workspace", async ({
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

    let reconciliationApiCalled = false;
    await page.route("**/api/v1/admin/reconciliation/**", async (route) => {
      reconciliationApiCalled = true;
      await route.abort();
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-merchant");
    });

    await page.goto("/admin/reconciliation");

    await expect(page.locator("[data-testid='access-restricted-alert']")).toBeVisible();
    expect(reconciliationApiCalled).toBe(false);
  });

  test("4. SYSTEM role is granted access and renders reconciliation workspace", async ({
    page,
  }) => {
    const mockJwt = createMockJwt("SYSTEM", "system@platform.local");

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: mockJwt,
          refreshToken: "mock-refresh-token-system",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      });
    });

    await page.route("**/api/v1/admin/reconciliation/cases*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 20,
          number: 0,
          first: true,
          last: true,
          empty: true,
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-system");
    });

    await page.goto("/admin/reconciliation");

    await expect(page.locator("[data-testid='reconciliation-workspace-heading']")).toBeVisible();
    await expect(page.locator("[data-testid='reconciliation-table-empty']")).toBeVisible();
  });

  test("5. ADMIN opens workspace, views cases, uses filters & pagination", async ({
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

    let requestedUrls: string[] = [];
    await page.route("**/api/v1/admin/reconciliation/cases*", async (route) => {
      const url = route.request().url();
      requestedUrls.push(url);

      if (url.includes("status=OPEN")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            content: [
              {
                id: mockCaseId,
                operationType: "PAYMENT",
                operationId: mockPaymentId,
                providerReference: "ch_stripe_e2e_001",
                localStatus: "PENDING_RECONCILIATION",
                reconciliationStatus: "OPEN",
                discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
                attemptCount: 1,
                nextAttemptAt: null,
                resolvedAt: null,
                workerId: "e2e-worker",
                correlationId: "corr-e2e-001",
                createdAt: "2026-09-26T12:00:00Z",
                updatedAt: "2026-09-26T12:05:00Z",
              },
            ],
            totalElements: 1,
            totalPages: 1,
            size: 20,
            number: 0,
            first: true,
            last: true,
            empty: false,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            content: [
              {
                id: mockCaseId,
                operationType: "PAYMENT",
                operationId: mockPaymentId,
                providerReference: "ch_stripe_e2e_001",
                localStatus: "PENDING_RECONCILIATION",
                reconciliationStatus: "OPEN",
                discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
                attemptCount: 1,
                nextAttemptAt: null,
                resolvedAt: null,
                workerId: "e2e-worker",
                correlationId: "corr-e2e-001",
                createdAt: "2026-09-26T12:00:00Z",
                updatedAt: "2026-09-26T12:05:00Z",
              },
            ],
            totalElements: 25,
            totalPages: 2,
            size: 20,
            number: 0,
            first: true,
            last: false,
            empty: false,
          }),
        });
      }
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/reconciliation");

    // Heading and cases table visible
    await expect(page.locator("[data-testid='reconciliation-workspace-heading']")).toBeVisible();
    await expect(page.locator(`[data-testid='reconciliation-row-${mockCaseId}']`)).toBeVisible();

    // Verify filter dropdown interaction
    const statusSelect = page.locator("#reconciliation-status-select");
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption("OPEN");

    // Apply filter
    await page.locator("[data-testid='reconciliation-apply-filters-button']").click();

    // URL should reflect status=OPEN
    await expect(page).toHaveURL(/status=OPEN/);

    // Verify pagination controls are visible
    await expect(page.locator("[data-testid='pagination-next-button']")).toBeVisible();
  });

  test("6. Case detail displays CASE INFO, EVIDENCE, ACTIONS, and executes confirmed mutation", async ({
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

    // Mock case detail API
    let mutationTriggered = 0;
    await page.route(`**/api/v1/admin/reconciliation/cases/${mockCaseId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockCaseId,
          operationType: "PAYMENT",
          operationId: mockPaymentId,
          providerReference: "ch_stripe_e2e_001",
          localStatus: "PENDING_RECONCILIATION",
          reconciliationStatus: mutationTriggered > 0 ? "IN_PROGRESS" : "OPEN",
          discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
          attemptCount: 1,
          nextAttemptAt: null,
          resolvedAt: null,
          workerId: "e2e-worker",
          correlationId: "corr-e2e-001",
          createdAt: "2026-09-26T12:00:00Z",
          updatedAt: "2026-09-26T12:05:00Z",
          attempts: [
            {
              id: "att-001",
              caseId: mockCaseId,
              attemptNumber: 1,
              status: "FAILED",
              errorMessage: "Provider gateway timeout during polling",
              executedAt: "2026-09-26T12:05:00Z",
            },
          ],
        }),
      });
    });

    // Mock trigger mutation endpoint
    await page.route(`**/api/v1/admin/reconciliation/cases/${mockCaseId}/trigger`, async (route) => {
      mutationTriggered++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockCaseId,
          operationType: "PAYMENT",
          operationId: mockPaymentId,
          providerReference: "ch_stripe_e2e_001",
          localStatus: "PENDING_RECONCILIATION",
          reconciliationStatus: "IN_PROGRESS",
          attemptCount: 2,
          nextAttemptAt: null,
          resolvedAt: null,
          workerId: "e2e-worker",
          correlationId: "corr-e2e-001",
          createdAt: "2026-09-26T12:00:00Z",
          updatedAt: "2026-09-26T12:15:00Z",
        }),
      });
    });

    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto(`/admin/reconciliation/${mockCaseId}`);

    // Verify all four authoritative sections
    await expect(page.locator("[data-testid='case-information-section']")).toBeVisible();
    await expect(page.locator("[data-testid='evidence-section']")).toBeVisible();
    await expect(page.locator("[data-testid='actions-section']")).toBeVisible();
    await expect(page.locator("[data-testid='audit-information-section']")).toBeVisible();

    // Verify authoritative evidence
    await expect(page.locator("[data-testid='evidence-provider-ref']")).toHaveText("ch_stripe_e2e_001");

    // Open confirmation modal for Trigger Execution
    const triggerBtn = page.locator("[data-testid='trigger-case-button']");
    await expect(triggerBtn).toBeVisible();
    await triggerBtn.click();

    // Confirmation dialog appears
    const modal = page.locator("[data-testid='reconciliation-action-modal']");
    await expect(modal).toBeVisible();
    await expect(page.locator("[data-testid='action-modal-confirm-button']")).toBeVisible();

    // Confirm execution
    await page.locator("[data-testid='action-modal-confirm-button']").click();

    // Modal closes and success notice displayed
    await expect(modal).not.toBeVisible();
    await expect(page.locator("[data-testid='action-success-banner']")).toBeVisible();
    expect(mutationTriggered).toBe(1);
  });
});
