import { expect, test } from '@playwright/test';

test('personal dashboard shows a five-skill radar, career cards, and SDG guidance', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('chart-personal-skills')).toBeVisible();
  await expect(page.locator('.radar-text-summary li')).toHaveCount(5);
  await expect(page.getByText('Transition options')).toBeVisible();
  await expect(page.locator('[data-testid^="link-dashboard-role-"]')).toHaveCount(3);
  await expect(page.getByText('Possible SDG links')).toBeVisible();
  await expect(page.getByText(/illustrative associations, not verified evidence/)).toBeVisible();
});

test('aggregate audience dashboards show cohort-level data without personal career recommendations', async ({ page }) => {
  await page.goto('/');

  for (const audience of ['hr', 'education']) {
    await page.getByTestId('select-audience-top').selectOption(audience);
    await expect(page.getByTestId('chart-cohort-skills')).toBeVisible();
    await expect(page.locator('.radar-text-summary li')).toHaveCount(5);
    await expect(page.locator('[data-testid^="card-dashboard-cohort-sdg-"]').first()).toBeVisible();
    await expect(page.getByTestId('link-dashboard-team')).toBeVisible();
    await expect(page.locator('[data-testid^="link-dashboard-role-"]')).toHaveCount(0);
  }
});
