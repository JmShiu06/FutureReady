import { defineConfig } from '@playwright/test';
import { LOCALE_STORAGE_KEY } from './src/i18n/locales';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:80';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: '/tmp/future-ready-workforce-playwright-results',
  reporter: 'list',
  timeout: 45_000,
  use: {
    baseURL,
    // Existing feature tests exercise a returning English-language user.
    // Language-onboarding tests explicitly override this with fresh storage.
    storageState: {
      cookies: [],
      origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: LOCALE_STORAGE_KEY, value: 'en' }] }],
    },
    browserName: 'chromium',
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/repl/tools/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
});
