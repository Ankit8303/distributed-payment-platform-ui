import { test, expect } from "@playwright/test";

test.describe("Phase F0 Smoke Tests", () => {
  test("loads landing foundation page with expected title and landmarks", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Distributed Payment & Ledger Platform/i);

    const heading = page.locator("h1");
    await expect(heading).toContainText("Distributed Payment");

    const badge = page.getByText(/Phase F[01] Active/i);
    await expect(badge).toBeVisible();
  });
});
