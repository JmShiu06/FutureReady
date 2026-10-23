import { test, expect } from '@playwright/test';
import { LOCALES, LOCALE_STORAGE_KEY } from '../../src/i18n/locales';
import { translate } from '../../src/i18n/messages';

test.use({ storageState: { cookies: [], origins: [] } });

for (const locale of LOCALES) {
  test(`first visit offers all eight languages and persists ${locale}`, async ({ page }) => {
    const aiRequests: string[] = [];
    await page.route('**/api/ai/**', route => {
      aiRequests.push(route.request().url());
      return route.abort();
    });
    await page.goto('/careers-and-jobs?tab=listings&q=data');
    await expect(page.getByTestId('dialog-language-chooser')).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(8);
    await page.getByTestId(`option-language-${locale}`).click();
    await expect(page.getByTestId('button-language-continue')).toHaveText(translate(locale, 'lang.continue'));
    await page.getByTestId('button-language-continue').click();
    await expect(page.getByTestId('dialog-language-chooser')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByTestId('link-nav-my-profile')).toHaveAttribute('aria-label', translate(locale, 'nav.profile'));
    await expect(page.getByTestId('input-job-search')).toHaveValue('data');
    await expect(page).toHaveURL(/\/careers-and-jobs\?tab=listings&q=data$/);
    expect(await page.evaluate(key => localStorage.getItem(key), LOCALE_STORAGE_KEY)).toBe(locale);
    await page.reload();
    await expect(page.getByTestId('select-language')).toHaveValue(locale);
    await expect(page.getByTestId('dialog-language-chooser')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    expect(aiRequests).toEqual([]);
  });
}

test('changing language preserves the current search, filters, result tab and device workspace', async ({ page }) => {
  await page.goto('/careers-and-jobs?tab=listings&q=data&group=2&skill=Critical+Thinking&results=dosm');
  await page.getByTestId('option-language-en').click();
  await page.getByTestId('button-language-continue').click();
  const previousURL = page.url();
  const workspace = await page.evaluate(() => localStorage.getItem('frw-demo-workspace-v1'));
  await page.getByTestId('select-language').selectOption('zh-TW');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page).toHaveURL(previousURL);
  await expect(page.getByTestId('select-filter-occupation')).toHaveValue('group:2');
  await expect(page.getByTestId('select-filter-skill')).toHaveValue('Critical Thinking');
  await expect(page.getByTestId('tab-dosm-groups')).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => localStorage.getItem('frw-demo-workspace-v1'))).toBe(workspace);
});

test('mobile supports Tamil without horizontal overflow and can change language later', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-profile');
  await page.getByTestId('option-language-ta').click();
  await page.getByTestId('button-language-continue').click();
  await expect(page.getByTestId('select-language')).toHaveValue('ta');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('select-language').selectOption('ko');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('blocked language storage still allows a session-only choice', async ({ page }) => {
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Blocked for test', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, LOCALE_STORAGE_KEY);
  await page.goto('/dashboard');
  await page.getByTestId('option-language-ja').click();
  await page.getByTestId('button-language-continue').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByTestId('banner-language-session')).toBeVisible();
});
