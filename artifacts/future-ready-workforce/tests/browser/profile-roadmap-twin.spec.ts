import { expect, test } from '@playwright/test';

test('explore does not retarget; build roadmap, complete, confirm, progress and reload persistence', async ({ page }) => {
  await page.goto('/careers');
  await expect(page.getByTestId('card-career-workforce-analyst')).toHaveCount(0);
  await expect(page.getByTestId('select-compare-a')).toHaveValue('');
  await expect(page.getByTestId('select-compare-b')).toHaveValue('');
  await page.goto('/profile?section=roadmap');
  await expect(page.getByTestId('progress-roadmap')).toBeVisible();
  await expect(page.getByTestId('text-plan-cost')).toBeVisible();
  await expect(page.getByTestId('panel-roadmap-target')).toContainText('No roadmap yet');

  await page.goto('/roles/workforce-analyst');
  await page.getByTestId('button-build-roadmap').click();
  await expect(page).toHaveURL(/section=roadmap/);
  await expect(page.getByTestId('text-roadmap-target')).toContainText('Workforce insights analyst');
  const before = Number(await page.getByTestId('progress-roadmap').getAttribute('aria-valuenow'));
  expect(before).toBe(0);

  await page.getByTestId('checkbox-milestone-1').check();
  await expect(page.getByTestId('progress-roadmap')).not.toHaveAttribute('aria-valuenow', '0');

  await page.getByTestId('tab-profile-twin').click();
  const start = await page.getByTestId('text-start-readiness').innerText();
  await expect(page.getByTestId('text-current-readiness')).toHaveText(start);
  await expect(page.getByTestId('text-progress-change')).toContainText('0 percentage points');
  await page.locator('[data-testid^="button-confirm-"]').first().click();
  await expect(page.getByTestId('text-progress-change')).toContainText('+');
  await expect(page.locator('[data-testid^="button-confirm-"]')).toHaveCount(0);
  await expect(page.getByTestId('section-twin-progress')).toBeVisible();
  await expect(page.getByTestId('table-skill-progress')).toBeVisible();
  await expect(page.getByTestId('section-simulator')).toHaveCount(0);

  await page.reload();
  await page.getByTestId('tab-profile-roadmap').click();
  await expect(page.getByTestId('checkbox-milestone-1')).toBeChecked();
  await page.goto('/roadmap');
  await expect(page).toHaveURL(/section=roadmap/);
});
