import { expect, test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const authenticatedState = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await mkdir("playwright/.auth", { recursive: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await page.waitForTimeout(250);
  await page.getByLabel("Username").fill(process.env.E2E_USERNAME ?? "");
  await page.locator('input[aria-label="Password"]').fill(process.env.E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeAttached();
  await page.context().storageState({ path: authenticatedState });
});
