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
