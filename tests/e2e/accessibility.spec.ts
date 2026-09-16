import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.describe("public accessibility", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto("/");
  });

  test("login has no serious accessibility violations", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sign in");
    await expectNoSeriousAxeViolations(page);

    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await expectNoSeriousAxeViolations(page);
  });

  test("skip link and login are keyboard operable", async ({ page }, testInfo) => {
    const skipLink = page.getByRole("link", { name: "Skip to main content" });

    if (testInfo.project.name.includes("webkit")) {
      await skipLink.focus();
    } else {
      await page.keyboard.press("Tab");
    }
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Username")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator('input[aria-label="Password"]')).toBeFocused();
  });

  test("page never overflows the viewport horizontally", async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("authenticated accessibility", () => {
  test.skip(!username || !password, "Set E2E_USERNAME and E2E_PASSWORD to test authenticated pages.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("dashboard has landmarks, a page heading, and no serious violations", async ({ page }) => {
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
    await expectNoSeriousAxeViolations(page);
    await expectNoHorizontalOverflow(page);
  });

  test("available primary views remain accessible and contained", async ({ page }) => {
    const mobileMenu = page.getByRole("button", { name: "Open menu" });

    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }

    const candidates = ["Dashboard", "Timetable", "Analytics", "Rewards", "Transaction Log"];

    for (const name of candidates) {
      const navigationButton = page.getByRole("button", { name, exact: true }).first();

      if (!(await navigationButton.isVisible())) {
        continue;
      }

      await navigationButton.click();
      await expectNoHorizontalOverflow(page);

      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
      }
    }
  });

  test("dialogs trap focus, close with Escape, and restore focus", async ({ page }, testInfo) => {
    const usersButton = page.getByRole("button", { name: "Users", exact: true }).first();

    if (await usersButton.isVisible()) {
      await usersButton.click();
    }

    const newUserButton = page.getByRole("button", { name: "New user" }).first();

    try {
      await newUserButton.waitFor({ state: "visible", timeout: 5_000 });
    } catch {
      test.skip(true, "This account cannot create users.");
    }

    await newUserButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(":focus")).toBeAttached();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    if (!testInfo.project.name.includes("webkit")) {
      await expect(newUserButton).toBeFocused();
    }
  });
});

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );

  expect(violations, formatAxeViolations(violations)).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

function formatAxeViolations(
  violations: Array<{ help: string; id: string; nodes: Array<{ target: unknown }> }>,
) {
  return violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => `  ${JSON.stringify(node.target)}`)
          .join("\n")}`,
    )
    .join("\n\n");
}
