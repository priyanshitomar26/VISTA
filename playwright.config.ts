import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  timeout: 90_000,

  use: {
    // Capture screenshots on failure
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // Ignore HTTPS errors for dev environments
    ignoreHTTPSErrors: true,
    // Consistent viewport for visual comparisons
    viewport: { width: 1440, height: 900 },
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },

  expect: {
    // Pixel diff threshold — 0.1 = 10% per-pixel tolerance
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 14'],
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  outputDir: 'test-results',
  snapshotDir: 'snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}-{projectName}{ext}',
});
