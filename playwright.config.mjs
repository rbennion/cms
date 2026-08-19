import { defineConfig, devices } from "@playwright/test";

// Browser tests. These drive the real app in a real browser, so they answer the
// question the API tests cannot: is the screen actually wired to the endpoint?
//
// They run against their own database and their own storage area — never dev,
// never staging, never production. e2e/global-setup.mjs builds that database
// from the real migrations and seeds a sign-in.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.mjs",
  // A shared database means these must not race each other.
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    // Keep evidence only for failures.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // The production build, not the dev server — closer to what actually ships.
    command: "npm run e2e:server",
    url: "http://localhost:3100/login",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
