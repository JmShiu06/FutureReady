import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: '/tmp/future-ready-workforce-playwright-results',
  reporter: 'list',
  timeout: 45_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:80',
    browserName: 'chromium',
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/repl/tools/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
});
