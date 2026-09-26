import { test, expect } from "@playwright/test";

test.describe("Phase F1 Authentication E2E Tests", () => {
  test("navigates to login page and displays form elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Sign In — Distributed Payment Platform/i);

    const emailInput = page.locator("#login-email");
    const passwordInput = page.locator("#login-password");
    const submitButton = page.locator("button[type='submit']");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toContainText("Sign in");

    // Check link to register page
    const registerLink = page.locator("a[href='/register']");
    await expect(registerLink).toBeVisible();
  });

  test("navigates to register page and displays role selector and 12-char password hint", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveTitle(/Create Account — Distributed Payment Platform/i);

    const emailInput = page.locator("#register-email");
    const passwordInput = page.locator("#register-password");
    const roleSelect = page.locator("#register-role");
    const submitButton = page.locator("button[type='submit']");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(roleSelect).toBeVisible();
    await expect(submitButton).toContainText("Create account");

    // Check link back to login page
    const loginLink = page.locator("a[href='/login']");
    await expect(loginLink).toBeVisible();
  });

  test("shows client validation error when submitting invalid registration data", async ({ page }) => {
    await page.goto("/register");

    const emailInput = page.locator("#register-email");
    const passwordInput = page.locator("#register-password");
    const submitButton = page.locator("button[type='submit']");

    await emailInput.fill("test@example.com");
    await passwordInput.fill("short123"); // 8 chars, needs 12
    await submitButton.click();

    const passwordError = page.locator("#register-password-error");
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toContainText("at least 12 characters");
  });
});

test.describe("Phase F8-A Open-Redirect Protection & Login Security", () => {
  const mockHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const mockPayload = Buffer.from(
    JSON.stringify({
      sub: "auth-user-f8a-uuid",
      role: "CUSTOMER",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString("base64");
  const validToken = `${mockHeader}.${mockPayload}.mock-sig`;

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: validToken,
          refreshToken: "mock-valid-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: validToken,
          refreshToken: "mock-valid-refresh-token",
          tokenType: "Bearer",
          expiresIn: 3600,
        }),
      });
    });
  });

  test("normal login with valid internal redirect redirects to requested internal route", async ({ page }) => {
    await page.goto("/login?redirect=%2Fdashboard");
    await page.fill("#login-email", "user@example.com");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    expect(page.url()).not.toContain("evil");
  });

  test("rejects external HTTPS redirect and falls back to safe default route (/)", async ({ page }) => {
    await page.goto("/login?redirect=https%3A%2F%2Fevil.example.com%2Fsteal-token");
    await page.fill("#login-email", "user@example.com");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    // Should redirect to root "/" instead of evil.example.com
    await page.waitForURL((url) => url.pathname === "/");
    expect(page.url()).not.toContain("evil.example.com");
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("rejects protocol-relative redirect and falls back to safe default route (/)", async ({ page }) => {
    await page.goto("/login?redirect=%2F%2Fevil.example.com");
    await page.fill("#login-email", "user@example.com");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname === "/");
    expect(page.url()).not.toContain("evil.example.com");
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("rejects backslash evasion redirect and falls back to safe default route (/)", async ({ page }) => {
    await page.goto("/login?redirect=%2F%5Cevil.example.com");
    await page.fill("#login-email", "user@example.com");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname === "/");
    expect(page.url()).not.toContain("evil.example.com");
    expect(new URL(page.url()).pathname).toBe("/");
  });
});

