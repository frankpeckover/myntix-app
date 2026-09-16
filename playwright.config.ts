import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const hasAuthenticatedCredentials = Boolean(
  process.env.E2E_USERNAME && process.env.E2E_PASSWORD,
);
const authenticatedState = "playwright/.auth/user.json";

const browserProjects = [
  {
    name: "desktop-chromium",
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "desktop-firefox",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "desktop-webkit",
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "chromebook",
    use: {
      browserName: "chromium" as const,
      viewport: { height: 768, width: 1366 },
    },
  },
  {
    name: "mobile-chromium",
    use: { ...devices["Pixel 7"] },
  },
  {
    name: "tablet-webkit",
    use: { ...devices["iPad (gen 7)"] },
  },
].map((project) => ({
  ...project,
  dependencies: hasAuthenticatedCredentials ? ["auth-setup"] : undefined,
  use: {
    ...project.use,
    storageState: hasAuthenticatedCredentials ? authenticatedState : undefined,
  },
}));

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: "test-results",
  projects: [
    ...(hasAuthenticatedCredentials
      ? [
          {
            name: "auth-setup",
            testMatch: /auth\.setup\.ts/,
            use: { ...devices["Desktop Chrome"] },
          },
        ]
      : []),
    ...browserProjects,
  ],
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  retries: process.env.CI ? 2 : 0,
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: baseURL,
      },
  workers: process.env.CI ? 2 : 6,
});
