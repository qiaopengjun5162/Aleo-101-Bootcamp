import { defineConfig } from "@playwright/test";

/**
 * Playwright config for Aleo PII Protocol L3 end-to-end tests.
 *
 * NOTE: We do NOT auto-start a webServer here — `scripts/dev.sh` is the single
 * source of truth for environment bring-up (per AGENTS.md / CLAUDE.md). Run
 * `./scripts/dev.sh` from repo root before invoking `bun x playwright test`.
 */
export default defineConfig({
  testDir: "./specs",
  outputDir: "./test-results",
  snapshotDir: "./screenshots",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    // Pin locale so i18n resolves to English deterministically (the app reads
    // navigator.language; en-US -> en strings). All specs assert English text.
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
