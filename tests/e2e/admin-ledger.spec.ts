import { test, expect } from "@playwright/test";

test.describe("Phase F7-F Admin Standalone Ledger Exploration E2E Tests", () => {
  test("redirects unauthenticated visitor from /admin/ledger/transactions to /login", async ({
    page,
  }) => {
    await page.goto("/admin/ledger/transactions");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fledger%2Ftransactions/);
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("loads ledger transactions, inspects details, and navigates to account ledger for ADMIN user", async ({
    page,
  }) => {
    const mockTxId = "ltx-11111111-2222-3333-4444-555555555555";
    const mockSourceRefId = "pay-11111111-2222-3333-4444-555555555555";
    const mockAccountId = "acc-payer-001";

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

    // Intercept backend ledger transactions list API
    await page.route("**/api/v1/admin/ledger/transactions?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: mockTxId,
              sourceReferenceId: mockSourceRefId,
              sourceReferenceType: "PAYMENT",
              description: "Settlement for payment",
              createdAt: "2026-09-26T10:00:00Z",
              entries: [
                {
                  id: "ent-001",
                  accountId: mockAccountId,
                  direction: "DEBIT",
                  amountMinor: 25000,
                  currency: "USD",
                  sequenceNumber: 1,
                  createdAt: "2026-09-26T10:00:00Z",
                },
                {
                  id: "ent-002",
                  accountId: "acc-payee-001",
                  direction: "CREDIT",
                  amountMinor: 25000,
                  currency: "USD",
                  sequenceNumber: 2,
                  createdAt: "2026-09-26T10:00:00Z",
                },
              ],
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

    // Intercept backend single ledger transaction detail API
    await page.route(`**/api/v1/admin/ledger/transactions/${mockTxId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockTxId,
          sourceReferenceId: mockSourceRefId,
          sourceReferenceType: "PAYMENT",
          description: "Settlement for payment",
          createdAt: "2026-09-26T10:00:00Z",
          entries: [
            {
              id: "ent-001",
              accountId: mockAccountId,
              direction: "DEBIT",
              amountMinor: 25000,
              currency: "USD",
              sequenceNumber: 1,
              createdAt: "2026-09-26T10:00:00Z",
            },
            {
              id: "ent-002",
              accountId: "acc-payee-001",
              direction: "CREDIT",
              amountMinor: 25000,
              currency: "USD",
              sequenceNumber: 2,
              createdAt: "2026-09-26T10:00:00Z",
            },
          ],
        }),
      });
    });

    // Intercept backend account ledger entries API
    await page.route(`**/api/v1/admin/ledger/accounts/${mockAccountId}/entries*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: "ent-001",
              accountId: mockAccountId,
              direction: "DEBIT",
              amountMinor: 25000,
              currency: "USD",
              sequenceNumber: 1,
              createdAt: "2026-09-26T10:00:00Z",
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

    // Seed session token into sessionStorage so AuthProvider triggers session refresh
    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    // 1. Visit Ledger Transactions page
    await page.goto("/admin/ledger/transactions");
    const heading = page.locator("h1");
    await expect(heading).toHaveText("Ledger Transactions");

    const row = page.locator(`[data-testid='ledger-tx-row-${mockTxId}']`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("PAYMENT");
    await expect(row).toContainText("Settlement for payment");

    // 2. Open Ledger Transaction Detail
    const viewBtn = page.locator(`[data-testid='view-ledger-tx-${mockTxId}']`);
    await viewBtn.click();
    await expect(page).toHaveURL(`/admin/ledger/transactions/${mockTxId}`);

    const detailHeading = page.locator("h1");
    await expect(detailHeading).toHaveText("Ledger Transaction");
    await expect(page.locator("[data-testid='source-reference-type']")).toHaveText("PAYMENT");

    // Check double-entry legs
    await expect(page.locator("[data-testid='ledger-entries-detail-table']")).toBeVisible();
    await expect(page.locator("[data-testid='entry-row-ent-001']")).toContainText("$250.00");
    await expect(page.locator("[data-testid='entry-row-ent-001']")).toContainText("DEBIT");

    // 3. Navigate to Account Ledger
    const accountLedgerLink = page.locator(`[data-testid='account-ledger-link-${mockAccountId}']`);
    await accountLedgerLink.click();
    await expect(page).toHaveURL(`/admin/ledger/accounts/${mockAccountId}`);

    const accountHeading = page.locator("h1");
    await expect(accountHeading).toHaveText("Account Ledger Entries");
    await expect(page.locator("[data-testid='header-account-id']")).toHaveText(mockAccountId);
    await expect(page.locator("[data-testid='account-entry-row-ent-001']")).toContainText("$250.00");
  });
});
