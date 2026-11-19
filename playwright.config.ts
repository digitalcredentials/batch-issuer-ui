import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'Chromium', use: { ...devices['Desktop Chrome'] } }],
  // With no BASE_URL, starts the Vite dev server (or reuses one already on
  // 5175; the wallet's front end uses 5173 and the admin console 5174).
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 5175 --strictPort',
        url: 'http://localhost:5175',
        // Not in CI: reusing whatever happens to be on the port there would
        // mean testing a stale build and passing.
        reuseExistingServer: !process.env.CI,
      },
})
