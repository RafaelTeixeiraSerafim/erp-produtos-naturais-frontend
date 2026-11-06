import { defineConfig, devices } from "playwright/test";
export default defineConfig({
  testDir: "./e2e-live",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  reporter: [["list"], ["html", { outputFolder: "playwright-live-report", open: "never" }]],
  outputDir: "test-results/live",
  use: {
    storageState: process.env.LIVE_SESSION ? JSON.parse(process.env.LIVE_SESSION) : undefined,
    baseURL: "http://127.0.0.1:3100",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "live-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "live-mobile", use: { ...devices["Pixel 7"] } },
  ],
});
