import { test, expect } from '@playwright/test';

test.describe('Phase F2 Customer Dashboard E2E Tests', () => {
  test('redirects unauthenticated visitor from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    // ProtectedRoute redirects unauthenticated users
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
    await expect(page.locator('#login-email')).toBeVisible();
  });

  test('redirects unauthenticated visitor from /accounts/[id] to /login', async ({ page }) => {
    const testUuid = '123e4567-e89b-12d3-a456-426614174000';
    await page.goto(`/accounts/${testUuid}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=%2Faccounts%2F${testUuid}`));
  });

  test('landing page contains link to login and register', async ({ page }) => {
    await page.goto('/');
    const signInLink = page.locator("a[href='/login']");
    const registerLink = page.locator("a[href='/register']");

    await expect(signInLink).toBeVisible();
    await expect(registerLink).toBeVisible();
  });
});
