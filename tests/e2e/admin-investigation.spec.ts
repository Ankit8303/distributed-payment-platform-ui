import { test, expect } from "@playwright/test";

test.describe("Phase F7-E Admin Payment Forensic Investigation E2E Tests", () => {
  test("redirects unauthenticated visitor from investigation page to /login", async ({
    page,
  }) => {
    const mockPaymentId = "pay-11111111-2222-3333-4444-555555555555";
    await page.goto(`/admin/investigations/payments/${mockPaymentId}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=%2Fadmin%2Finvestigations%2Fpayments%2F${mockPaymentId}`));
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("navigates from payments to investigation and verifies authoritative distributed trace", async ({
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

    // Intercept backend investigation trace API
    await page.route(`**/api/v1/admin/investigations/payments/${mockPaymentId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          payment: {
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
          payerAccount: {
            id: "acc-payer-001",
            accountNumber: "ACT-PAYER-100",
            ownerId: "usr-001",
            accountType: "CHECKING",
            currency: "USD",
            status: "ACTIVE",
            materializedBalanceMinor: 125000,
            version: 1,
            createdAt: "2026-09-25T08:00:00Z",
            updatedAt: "2026-09-26T10:00:05Z",
          },
          payeeAccount: {
            id: "acc-payee-001",
            accountNumber: "ACT-PAYEE-200",
            ownerId: "usr-002",
            accountType: "SAVINGS",
            currency: "USD",
            status: "ACTIVE",
            materializedBalanceMinor: 54000,
            version: 2,
            createdAt: "2026-09-25T08:00:00Z",
            updatedAt: "2026-09-26T10:00:06Z",
          },
          ledgerTransaction: {
            id: "ltx-11111111-2222-3333-4444-555555555555",
            sourceReferenceId: mockPaymentId,
            sourceReferenceType: "PAYMENT",
            description: "Payment Settlement",
            createdAt: "2026-09-26T10:00:10Z",
            entries: [
              {
                id: "ent-001",
                accountId: "acc-payer-001",
                direction: "DEBIT",
                amountMinor: 25000,
                currency: "USD",
                sequenceNumber: 1,
                createdAt: "2026-09-26T10:00:10Z",
              },
              {
                id: "ent-002",
                accountId: "acc-payee-001",
                direction: "CREDIT",
                amountMinor: 25000,
                currency: "USD",
                sequenceNumber: 2,
                createdAt: "2026-09-26T10:00:10Z",
              },
            ],
          },
          outboxEvents: [
            {
              eventId: "evt-001",
              eventType: "PAYMENT_SETTLED",
              aggregateType: "PAYMENT",
              aggregateId: mockPaymentId,
              status: "PUBLISHED",
              topic: "payment.events",
              createdAt: "2026-09-26T10:00:15Z",
              publishedAt: "2026-09-26T10:00:16Z",
            },
          ],
          kafkaAudits: [
            {
              id: "kaud-001",
              eventId: "evt-001",
              eventType: "PAYMENT_SETTLED",
              aggregateId: mockPaymentId,
              correlationId: "corr-trace-8899",
              createdAt: "2026-09-26T10:00:17Z",
            },
          ],
          reconciliationCases: [
            {
              id: "rc-001",
              operationType: "PAYMENT",
              operationId: mockPaymentId,
              providerReference: "prov-ref-987",
              localStatus: "SETTLED",
              reconciliationStatus: "RESOLVED",
              discrepancyType: "PROVIDER_SUCCESS_LOCAL_PENDING",
              attemptCount: 1,
              nextAttemptAt: null,
              resolvedAt: "2026-09-26T10:01:00Z",
              workerId: "recon-worker-1",
              correlationId: "corr-trace-8899",
              createdAt: "2026-09-26T10:00:30Z",
              updatedAt: "2026-09-26T10:01:00Z",
            },
          ],
          notifications: [
            {
              id: "notif-001",
              eventId: "evt-001",
              channel: "EMAIL",
              status: "SENT",
              attemptCount: 1,
              nextAttemptAt: null,
              recipientRedacted: "us***@platform.local",
              createdAt: "2026-09-26T10:00:20Z",
            },
          ],
        }),
      });
    });

    // Seed session token into sessionStorage so AuthProvider triggers session refresh
    await page.addInitScript(() => {
      window.sessionStorage.setItem("dpp_rt", "mock-refresh-token-admin");
    });

    // 1. Visit Payments list
    await page.goto("/admin/payments");
    const row = page.locator(`[data-testid='payment-row-${mockPaymentId}']`);
    await expect(row).toBeVisible();

    // 2. Click "View" to go to payment detail
    const viewLink = page.locator(`[data-testid='view-payment-link-${mockPaymentId}']`);
    await viewLink.click();
    await expect(page).toHaveURL(`/admin/payments/${mockPaymentId}`);

    // 3. Click "Investigate Distributed Trace"
    const investigateLink = page.locator("[data-testid='investigate-payment-button']");
    await expect(investigateLink).toBeVisible();
    await investigateLink.click();

    // 4. Arrive at Investigation page
    await expect(page).toHaveURL(`/admin/investigations/payments/${mockPaymentId}`);

    // 5. Verify Investigation Headings and Sections
    const heading = page.locator("h1");
    await expect(heading).toHaveText("Payment Investigation");

    // Payment summary
    await expect(page.locator("[data-testid='detail-amount-value']")).toHaveText("$250.00");
    await expect(page.locator("[data-testid='detail-fee-value']")).toHaveText("$1.50");

    // Accounts
    await expect(page.locator("[data-testid='payer-account-id']")).toHaveText("acc-payer-001");
    await expect(page.locator("[data-testid='payee-account-id']")).toHaveText("acc-payee-001");

    // Ledger Double-Entry
    await expect(page.locator("[data-testid='ledger-entries-table']")).toBeVisible();
    await expect(page.locator("[data-testid='ledger-direction-badge-debit']")).toHaveText("DEBIT");
    await expect(page.locator("[data-testid='ledger-direction-badge-credit']")).toHaveText("CREDIT");

    // Outbox & Kafka
    await expect(page.locator("[data-testid='outbox-status-badge-published']")).toHaveText("PUBLISHED");
    await expect(page.locator("[data-testid='kafka-audit-section']")).toContainText("corr-trace-8899");

    // Reconciliation & Notifications
    await expect(page.locator("[data-testid='recon-status-badge-resolved']")).toHaveText("RESOLVED");
    await expect(page.locator("[data-testid='notification-status-badge-sent']")).toHaveText("SENT");

    // Timeline
    await expect(page.locator("[data-testid='investigation-timeline-section']")).toBeVisible();
  });
});
