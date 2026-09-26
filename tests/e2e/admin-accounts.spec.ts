import { test, expect } from "@playwright/test";

test.describe("Phase F7-G-B / F7-G-C / F7-G-D Admin Accounts E2E Tests", () => {
  test("redirects unauthenticated visitor from /admin/accounts to /login", async ({
    page,
  }) => {
    await page.goto("/admin/accounts");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Faccounts/);
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("loads admin account explorer, navigates to inspector, and verifies balance consistency for ADMIN user", async ({
    page,
  }) => {
    const mockAccountId = "acc-e2e-1111-2222-3333-444444444444";

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

    const accountRecord = {
      id: mockAccountId,
      accountNumber: "ACC-US-9999",
      ownerId: "usr-e2e-owner-001",
      accountType: "CUSTOMER",
      currency: "USD",
      status: "ACTIVE",
      materializedBalanceMinor: 125050,
      version: 1,
      createdAt: "2026-09-26T10:00:00Z",
      updatedAt: "2026-09-26T10:01:00Z",
    };

    const balanceSummaryRecord = {
      accountId: mockAccountId,
      accountNumber: "ACC-US-9999",
      currency: "USD",
      materializedBalanceMinor: 125050,
      authoritativeLedgerBalanceMinor: 125050,
      differenceMinor: 0,
      isConsistent: true,
    };

    // Intercept backend accounts list API
    await page.route("**/api/v1/admin/accounts?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [accountRecord],
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

    // Intercept single account detail API
    await page.route(`**/api/v1/admin/accounts/${mockAccountId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(accountRecord),
      });
    });

    // Intercept balance-summary API (Phase F7-G-D)
    await page.route(`**/api/v1/admin/accounts/${mockAccountId}/balance-summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(balanceSummaryRecord),
      });
    });

    // Seed session token into sessionStorage so AuthProvider triggers session refresh
    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto("/admin/accounts");

    // Verify page header
    const heading = page.locator("h1");
    await expect(heading).toHaveText("Account Explorer");

    // Verify account row renders backend data
    const row = page.locator(`[data-testid='account-row-${mockAccountId}']`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("ACC-US-9999");
    await expect(row).toContainText("usr-e2e-");
    await expect(row).toContainText("CUSTOMER");
    await expect(row).toContainText("$1,250.50");
    await expect(row).toContainText(/active/i);

    // Click "Inspect" to navigate to detail view
    const inspectLink = page.locator(`[data-testid='inspect-account-link-${mockAccountId}']`);
    await inspectLink.click();

    // Verify URL and inspector view
    await expect(page).toHaveURL(`/admin/accounts/${mockAccountId}`);
    const inspectorHeading = page.locator("h1");
    await expect(inspectorHeading).toHaveText("Account Inspector");

    // Verify authoritative account details rendered on inspector page
    await expect(page.locator("[data-testid='detail-account-number']")).toHaveText("ACC-US-9999");
    await expect(page.locator("[data-testid='detail-account-id']")).toHaveText(mockAccountId);
    await expect(page.locator("[data-testid='detail-owner-id']")).toHaveText("usr-e2e-owner-001");
    await expect(page.locator("[data-testid='detail-materialized-balance']")).toHaveText("$1,250.50");

    // Verify Balance Consistency Section (Phase F7-G-D)
    const consistencySection = page.locator("[data-testid='section-balance-consistency']");
    await expect(consistencySection).toBeVisible();
    await expect(page.locator("[data-testid='balance-materialized-value']")).toHaveText("$1,250.50");
    await expect(page.locator("[data-testid='balance-ledger-value']")).toHaveText("$1,250.50");
    await expect(page.locator("[data-testid='balance-difference-value']")).toHaveText("$0.00");
    await expect(page.locator("[data-testid='consistency-status-badge']")).toContainText("Consistent");

    // Verify Phase F7-G-E lifecycle button presence (Freeze available for ACTIVE, Unfreeze not available)
    await expect(page.locator("[data-testid='freeze-account-button']")).toBeVisible();
    await expect(page.locator("[data-testid='unfreeze-account-button']")).toHaveCount(0);
    await expect(page.locator("[data-testid='ledger-transactions-table']")).toHaveCount(0);
  });

  test("Phase F7-G-E: executes freeze and unfreeze account lifecycle workflows with reason validation", async ({
    page,
  }) => {
    const mockAccountId = "acc-e2e-freeze-1111-2222-333333333333";

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

    let currentStatus = "ACTIVE";
    let freezeCallCount = 0;
    let unfreezeCallCount = 0;
    let lastFreezeBody: unknown = null;
    let lastUnfreezeBody: unknown = null;

    // Intercept single account detail API
    await page.route(`**/api/v1/admin/accounts/${mockAccountId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockAccountId,
          accountNumber: "ACC-US-FREEZE-1",
          ownerId: "usr-e2e-owner-002",
          accountType: "CUSTOMER",
          currency: "USD",
          status: currentStatus,
          materializedBalanceMinor: 50000,
          version: 1,
          createdAt: "2026-09-26T10:00:00Z",
          updatedAt: "2026-09-26T10:01:00Z",
        }),
      });
    });

    // Intercept balance-summary API
    await page.route(`**/api/v1/admin/accounts/${mockAccountId}/balance-summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accountId: mockAccountId,
          accountNumber: "ACC-US-FREEZE-1",
          currency: "USD",
          materializedBalanceMinor: 50000,
          authoritativeLedgerBalanceMinor: 50000,
          differenceMinor: 0,
          isConsistent: true,
        }),
      });
    });

    // Intercept freeze API
    await page.route(`**/api/v1/admin/accounts/${mockAccountId}/freeze`, async (route) => {
      freezeCallCount++;
      lastFreezeBody = route.request().postDataJSON();
      currentStatus = "FROZEN";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockAccountId,
          accountNumber: "ACC-US-FREEZE-1",
          ownerId: "usr-e2e-owner-002",
          accountType: "CUSTOMER",
          currency: "USD",
          status: "FROZEN",
          materializedBalanceMinor: 50000,
          version: 2,
          createdAt: "2026-09-26T10:00:00Z",
          updatedAt: "2026-09-26T10:05:00Z",
        }),
      });
    });

    // Intercept unfreeze API
    await page.route(`**/api/v1/admin/accounts/${mockAccountId}/unfreeze`, async (route) => {
      unfreezeCallCount++;
      lastUnfreezeBody = route.request().postDataJSON();
      currentStatus = "ACTIVE";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockAccountId,
          accountNumber: "ACC-US-FREEZE-1",
          ownerId: "usr-e2e-owner-002",
          accountType: "CUSTOMER",
          currency: "USD",
          status: "ACTIVE",
          materializedBalanceMinor: 50000,
          version: 3,
          createdAt: "2026-09-26T10:00:00Z",
          updatedAt: "2026-09-26T10:10:00Z",
        }),
      });
    });

    // Seed session token into sessionStorage
    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto(`/admin/accounts/${mockAccountId}`);

    // Verify ACTIVE account displays Freeze button
    await expect(page.locator("[data-testid='detail-account-status']")).toContainText(/active/i);
    const freezeBtn = page.locator("[data-testid='freeze-account-button']");
    await expect(freezeBtn).toBeVisible();

    // 1. Open Freeze Modal
    await freezeBtn.click();
    const modal = page.locator("[data-testid='account-lifecycle-modal']");
    await expect(modal).toBeVisible();
    await expect(page.locator("[data-testid='lifecycle-modal-title']")).toHaveText("Freeze Account");
    // Verify no request was fired merely by opening modal
    expect(freezeCallCount).toBe(0);

    // 2. Validate reason: empty/whitespace validation
    const confirmBtn = page.locator("[data-testid='confirm-lifecycle-button']");
    await confirmBtn.click();
    await expect(page.locator("[data-testid='lifecycle-reason-error']")).toBeVisible();
    await expect(page.locator("[data-testid='lifecycle-reason-error']")).toContainText("A non-blank operational justification is required.");
    expect(freezeCallCount).toBe(0);

    // 3. Enter whitespace-only reason
    const reasonInput = page.locator("[data-testid='lifecycle-reason-input']");
    await reasonInput.fill("    ");
    await confirmBtn.click();
    await expect(page.locator("[data-testid='lifecycle-reason-error']")).toBeVisible();
    expect(freezeCallCount).toBe(0);

    // 4. Enter valid reason and submit
    await reasonInput.fill("Suspicious AML velocity pattern detected");
    await confirmBtn.click();

    // 5. Verify successful freeze execution
    await expect(modal).not.toBeVisible();
    expect(freezeCallCount).toBe(1);
    expect(lastFreezeBody).toEqual({ reason: "Suspicious AML velocity pattern detected" });

    // 6. Verify status updated to FROZEN
    await expect(page.locator("[data-testid='lifecycle-success-banner']")).toBeVisible();
    await expect(page.locator("[data-testid='detail-account-status']")).toContainText(/frozen/i);

    // 7. Verify Unfreeze button is now available and Freeze is gone
    const unfreezeBtn = page.locator("[data-testid='unfreeze-account-button']");
    await expect(unfreezeBtn).toBeVisible();
    await expect(page.locator("[data-testid='freeze-account-button']")).toHaveCount(0);

    // 8. Open Unfreeze Modal
    await unfreezeBtn.click();
    await expect(modal).toBeVisible();
    await expect(page.locator("[data-testid='lifecycle-modal-title']")).toHaveText("Unfreeze Account");
    expect(unfreezeCallCount).toBe(0);

    // 9. Enter valid unfreeze reason and submit
    await page.locator("[data-testid='lifecycle-reason-input']").fill("AML review cleared by compliance officer");
    await page.locator("[data-testid='confirm-lifecycle-button']").click();

    // 10. Verify successful unfreeze execution
    await expect(modal).not.toBeVisible();
    expect(unfreezeCallCount).toBe(1);
    expect(lastUnfreezeBody).toEqual({ reason: "AML review cleared by compliance officer" });

    // 11. Verify status returned to ACTIVE
    await expect(page.locator("[data-testid='detail-account-status']")).toContainText(/active/i);
    await expect(page.locator("[data-testid='freeze-account-button']")).toBeVisible();
  });

  test("Phase F7-G-F: navigates from Account Inspector to Account Ledger and Account Audit History", async ({
    page,
  }) => {
    const mockAccountId = "acc-e2e-nav-1111-2222-333333333333";

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

    const accountRecord = {
      id: mockAccountId,
      accountNumber: "ACC-US-NAV-1",
      ownerId: "usr-e2e-owner-003",
      accountType: "CUSTOMER",
      currency: "USD",
      status: "ACTIVE",
      materializedBalanceMinor: 75000,
      version: 1,
      createdAt: "2026-09-26T10:00:00Z",
      updatedAt: "2026-09-26T10:01:00Z",
    };

    // Intercept account detail API
    await page.route(`**/api/v1/admin/accounts/${mockAccountId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(accountRecord),
      });
    });

    // Intercept balance-summary API
    await page.route(`**/api/v1/admin/accounts/${mockAccountId}/balance-summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accountId: mockAccountId,
          accountNumber: "ACC-US-NAV-1",
          currency: "USD",
          materializedBalanceMinor: 75000,
          authoritativeLedgerBalanceMinor: 75000,
          differenceMinor: 0,
          isConsistent: true,
        }),
      });
    });

    // Intercept account ledger entries API
    await page.route(`**/api/v1/admin/ledger/accounts/${mockAccountId}/entries*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          pageable: { pageNumber: 0, pageSize: 20, offset: 0, paged: true, unpaged: false },
          totalElements: 0,
          totalPages: 0,
          last: true,
          first: true,
          size: 20,
          number: 0,
          empty: true,
        }),
      });
    });

    // Intercept audit logs API
    await page.route("**/api/v1/admin/audit-logs*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          pageable: { pageNumber: 0, pageSize: 20, offset: 0, paged: true, unpaged: false },
          totalElements: 0,
          totalPages: 0,
          last: true,
          first: true,
          size: 20,
          number: 0,
          empty: true,
        }),
      });
    });

    // Seed session token into sessionStorage
    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    await page.goto(`/admin/accounts/${mockAccountId}`);

    // Verify Ledger & Audit section
    const ledgerAuditSection = page.locator("[data-testid='section-ledger-audit']");
    await expect(ledgerAuditSection).toBeVisible();

    // 1. Click "View Account Ledger"
    const ledgerLink = page.locator("[data-testid='view-account-ledger-link']");
    await expect(ledgerLink).toBeVisible();
    await ledgerLink.click();

    // 2. Verify destination is /admin/ledger/accounts/[accountId]
    await expect(page).toHaveURL(`/admin/ledger/accounts/${mockAccountId}`);
    await expect(page.locator("h1")).toHaveText("Account Ledger Entries");
    await expect(page.locator("[data-testid='header-account-id']")).toHaveText(mockAccountId);

    // 3. Return to Account Inspector
    await page.goto(`/admin/accounts/${mockAccountId}`);
    await expect(page.locator("h1")).toHaveText("Account Inspector");

    // 4. Click "View Account Audit History"
    const auditLink = page.locator("[data-testid='view-account-audit-link']");
    await expect(auditLink).toBeVisible();
    await auditLink.click();

    // 5. Verify destination is /admin/audit with resourceType and resourceId
    await expect(page).toHaveURL(new RegExp(`/admin/audit\\?.*resourceType=ACCOUNT.*`));
    await expect(page).toHaveURL(new RegExp(`/admin/audit\\?.*resourceId=${mockAccountId}.*`));
    await expect(page.locator("h1")).toHaveText("Audit Log Explorer");
    await expect(page.locator("[data-testid='header-resource-id']")).toHaveText(mockAccountId);
  });
});
