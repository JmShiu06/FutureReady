import { test, expect } from '@playwright/test';

test('one submitted search controls both result tabs and Clear all returns to the empty state', async ({ page }) => {
  await page.goto('/careers-and-jobs?tab=listings');
  await expect(page.getByTestId('status-search-welcome')).toBeVisible();
  await expect(page.getByTestId('input-job-search')).toHaveCount(1);
  await expect(page.getByTestId('panel-filters')).toBeVisible();
  await expect(page.getByText('Filter occupation results', { exact: true })).toHaveCount(0);

  const search = page.getByTestId('input-job-search');
  await search.fill('data');
  await expect(page.getByTestId('status-search-welcome')).toBeVisible();
  await search.press('Enter');
  await expect(page.getByTestId('tab-sample-listings')).toHaveText('Sample listings (9)');
  await expect(page.getByTestId('tab-dosm-groups')).toHaveText('DOSM occupation groups (1)');
  await expect(page.getByTestId('list-jobs').locator('article')).toHaveCount(9);
  await page.getByTestId('tab-dosm-groups').click();
  await expect(page.getByTestId('card-dosm-occupation-2')).toBeVisible();
  const unchangedTotal = await page.getByTestId('text-dosm-employed-2').textContent();
  await expect(page.getByTestId('details-dosm-sources')).not.toHaveAttribute('open', '');

  await page.getByTestId('select-filter-location').selectOption({ index: 1 });
  await expect(page.getByTestId('text-dosm-scope-note')).toHaveText("Location, work mode and level don't apply to DOSM group data.");
  await expect(page.getByTestId('text-dosm-employed-2')).toHaveText(unchangedTotal!);
  await page.getByTestId('button-remove-filter-location').click();
  await expect(page.getByTestId('select-filter-location')).toHaveValue('');
  await page.getByTestId('button-clear-all').click();
  await expect(search).toHaveValue('');
  await expect(page.getByTestId('status-search-welcome')).toBeVisible();
  await expect(page.getByTestId('list-active-filters')).toHaveCount(0);
  await expect(page).toHaveURL(/\/careers-and-jobs\?tab=listings$/);

  await search.fill('nurse');
  await page.getByTestId('button-search').click();
  await expect(page.getByTestId('tab-sample-listings')).toHaveText('Sample listings (3)');
});

test('group and skill share one panel and survive opening listing details', async ({ page }) => {
  await page.goto('/careers-and-jobs?tab=listings&q=data');
  await expect(page.getByTestId('tab-sample-listings')).toHaveText('Sample listings (9)');
  await page.getByTestId('select-filter-occupation').selectOption('group:2');
  await page.getByTestId('select-filter-skill').selectOption('Critical Thinking');
  await expect(page.getByTestId('tab-sample-listings')).toHaveText('Sample listings (9)');
  await expect(page.getByTestId('tab-dosm-groups')).toHaveText('DOSM occupation groups (1)');
  await expect(page.getByTestId('button-remove-filter-group')).toBeVisible();
  await expect(page.getByTestId('button-remove-filter-skill')).toBeVisible();
  await page.getByTestId('list-jobs').getByText('View details', { exact: true }).first().click();
  await page.goBack();
  await expect(page.getByTestId('select-filter-occupation')).toHaveValue('group:2');
  await expect(page.getByTestId('select-filter-skill')).toHaveValue('Critical Thinking');
  await page.getByTestId('button-remove-filter-skill').click();
  await expect(page.getByTestId('select-filter-skill')).toHaveValue('');
});

test('mobile starts with filters collapsed and has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/careers-and-jobs?tab=listings');
  await expect(page.getByTestId('panel-filters')).toBeHidden();
  await page.getByTestId('button-toggle-filters').click();
  await expect(page.getByTestId('panel-filters')).toBeVisible();
  await page.getByTestId('button-suggest-cyber').click();
  await expect(page.getByTestId('tab-sample-listings')).toHaveText('Sample listings (3)');
  await page.getByTestId('tab-dosm-groups').click();
  await expect(page.getByTestId('card-dosm-occupation-2')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId('button-clear-all').click();
  await expect(page.getByTestId('status-search-welcome')).toBeVisible();
});
