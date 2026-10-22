import { expect, test } from '@playwright/test';

test('explore does not retarget; build roadmap, complete, confirm, progress and reload persistence', async ({ page }) => {
  await page.goto('/careers-and-jobs?tab=career-paths');
  await expect(page.getByTestId('card-career-workforce-analyst')).toHaveCount(0);
  await expect(page.getByTestId('select-compare-a')).toHaveValue('');
  await expect(page.getByTestId('select-compare-b')).toHaveValue('');
  await page.goto('/learning-roadmap');
  await expect(page.getByTestId('progress-roadmap')).toBeVisible();
  await expect(page.getByTestId('text-plan-cost')).toBeVisible();
  await expect(page.getByTestId('panel-roadmap-target')).toContainText('No roadmap yet');

  await page.goto('/careers-and-jobs/roles/workforce-analyst');
  await page.getByTestId('button-build-roadmap').click();
  await expect(page).toHaveURL(/\/learning-roadmap$/);
  await expect(page.getByTestId('text-roadmap-target')).toContainText('Workforce insights analyst');
  const before = Number(await page.getByTestId('progress-roadmap').getAttribute('aria-valuenow'));
  expect(before).toBe(0);

  await page.getByTestId('checkbox-milestone-1').check();
  await expect(page.getByTestId('progress-roadmap')).not.toHaveAttribute('aria-valuenow', '0');

  await page.getByTestId('button-open-twin').click();
  await expect(page).toHaveURL(/\/my-profile\?section=twin$/);
  const start = await page.getByTestId('text-start-readiness').innerText();
  await expect(page.getByTestId('text-current-readiness')).toHaveText(start);
  await expect(page.getByTestId('text-progress-change')).toContainText('0 percentage points');
  await page.locator('[data-testid^="button-confirm-"]').first().click();
  await expect(page.getByTestId('text-progress-change')).toContainText('+');
  await expect(page.locator('[data-testid^="button-confirm-"]')).toHaveCount(0);
  await expect(page.getByTestId('section-twin-progress')).toBeVisible();
  await expect(page.getByTestId('table-skill-progress')).toBeVisible();
  await expect(page.getByTestId('section-simulator')).toHaveCount(0);

  await page.goto('/learning-roadmap');
  await page.reload();
  await expect(page.getByTestId('checkbox-milestone-1')).toBeChecked();
  await page.goto('/roadmap');
  await expect(page).toHaveURL(/\/learning-roadmap$/);
  await expect(page.getByTestId('checkbox-milestone-1')).toBeChecked();
});

test('reset roadmap requires confirmation and clears only roadmap progress', async ({ page }) => {
  await page.goto('/careers-and-jobs/roles/workforce-analyst');
  await page.getByTestId('button-build-roadmap').click();
  await expect(page.getByTestId('button-reset-roadmap')).toBeVisible();
  await page.getByTestId('checkbox-milestone-1').check();
  await page.getByTestId('button-open-twin').click();
  await page.locator('[data-testid^="button-confirm-"]').first().click();

  await page.goto('/learning-roadmap');
  await page.getByTestId('input-replan-hours').fill('5');
  await page.getByTestId('input-replan-budget').fill('250');
  await page.getByTestId('button-apply-replan').click();
  await page.getByTestId('button-reset-roadmap').click();
  await expect(page.getByTestId('dialog-reset-roadmap')).toContainText('profile skills, learning hours and budget will stay unchanged');
  await page.getByTestId('button-cancel-reset-roadmap').click();
  await expect(page.getByTestId('text-roadmap-target')).toContainText('Workforce insights analyst');

  await page.getByTestId('button-reset-roadmap').click();
  await page.getByTestId('button-confirm-reset-roadmap').click();
  await expect(page.getByTestId('panel-roadmap-target')).toContainText('No roadmap yet');
  await expect(page.getByTestId('checkbox-milestone-1')).toHaveCount(0);
  await expect(page.getByTestId('input-replan-hours')).toHaveValue('5');
  await expect(page.getByTestId('input-replan-budget')).toHaveValue('250');

  await page.goto('/my-profile?section=twin');
  await expect(page.getByTestId('text-start-readiness')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('text-shell-name')).toBeVisible();
});
