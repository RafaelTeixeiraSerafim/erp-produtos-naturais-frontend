import { defineConfig, devices } from "playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: { baseURL: "http://127.0.0.1:3200", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [{ command: "node scripts/auth-fixture.mjs", url: "http://127.0.0.1:8099/api/auth/csrf", reuseExistingServer: false }, {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3200",
    env: { BACKEND_API_URL: "http://127.0.0.1:8099", FRONTEND_ORIGINS: "http://127.0.0.1:3200" },
    url: "http://127.0.0.1:3200",
    reuseExistingServer: false,
    timeout: 240000,
  }],
});
