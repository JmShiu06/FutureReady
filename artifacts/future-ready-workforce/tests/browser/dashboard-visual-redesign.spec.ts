import { expect, test } from '@playwright/test';

test('personal dashboard is summary-only with links into the five main areas', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('nav[aria-label="Main navigation"] a')).toHaveCount(5);
  await expect(page.locator('nav[aria-label="Main navigation"] a')).toHaveText(['Dashboard', 'My profile', 'Careers & jobs', 'Market & AI impact', 'Learning roadmap']);
  await expect(page.getByTestId('link-nav-dashboard')).toHaveAttribute('aria-current', 'page');
  for (const id of ['target', 'profile', 'careers', 'roadmap', 'market']) await expect(page.getByTestId(`card-summary-${id}`)).toBeVisible();
  await expect(page.getByTestId('stat-target-coverage')).toBeVisible();
  // No duplicated detail views on the dashboard.
  await expect(page.getByTestId('chart-personal-skills')).toHaveCount(0);
  await expect(page.locator('[data-testid^="card-dashboard-sdg-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="panel-ai-"]')).toHaveCount(0);
  // One demo banner, one audience selector.
  await expect(page.getByTestId('banner-demo')).toHaveCount(1);
  await expect(page.locator('select[aria-label="Switch audience workspace"]')).toHaveCount(1);
  await page.getByTestId('link-summary-roadmap').click();
  await expect(page).toHaveURL(/\/learning-roadmap$/);
  await expect(page.getByTestId('link-nav-learning-roadmap')).toHaveAttribute('aria-current', 'page');
});

test('aggregate audience dashboards summarise cohorts and reach team planning', async ({ page }) => {
  await page.goto('/dashboard');
  for (const audience of ['hr', 'education']) {
    await page.getByTestId('select-audience-top').selectOption(audience);
    await expect(page.getByTestId('stat-avg-coverage')).toBeVisible();
    await expect(page.getByTestId('chart-cohort-skills')).toHaveCount(0);
    await expect(page.locator('[data-testid^="link-dashboard-role-"]')).toHaveCount(0);
    await expect(page.getByTestId('link-dashboard-team')).toBeVisible();
  }
  await expect(page.locator('nav[aria-label="Main navigation"] a')).toHaveCount(5);
  await page.getByTestId('link-dashboard-team').click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByTestId('link-nav-dashboard')).toHaveAttribute('aria-current', 'page');
});

test('legacy routes redirect to canonical destinations', async ({ page }) => {
  const cases: [string, RegExp][] = [
    ['/', /\/dashboard$/],
    ['/profile', /\/my-profile$/],
    ['/profile?section=twin', /\/my-profile\?section=twin$/],
    ['/profile?section=roadmap', /\/learning-roadmap$/],
    ['/careers', /\/careers-and-jobs\?tab=career-paths$/],
    ['/sdgs', /\/careers-and-jobs\?tab=career-paths$/],
    ['/cv-analysis', /\/careers-and-jobs\?tab=matched-roles$/],
    ['/jobs', /\/careers-and-jobs\?tab=listings$/],
    ['/jobs/sample-1', /\/careers-and-jobs\/listings\/sample-1$/],
    ['/roles/workforce-analyst', /\/careers-and-jobs\/roles\/workforce-analyst$/],
    ['/trends', /\/market-and-ai-impact\?tab=market$/],
    ['/scenarios', /\/market-and-ai-impact\?tab=ai-impact$/],
    ['/roadmap', /\/learning-roadmap$/],
    ['/twin', /\/my-profile\?section=twin$/],
  ];
  for (const [from, to] of cases) {
    await page.goto(from);
    await expect(page).toHaveURL(to);
  }
  await page.goto('/careers-and-jobs/roles/workforce-analyst');
  await expect(page.getByTestId('link-nav-careers-and-jobs')).toHaveAttribute('aria-current', 'page');
});

test('careers tabs are keyboard operable, deep-linkable, and the AI drawer is a single modal', async ({ page }) => {
  await page.goto('/careers-and-jobs?tab=listings');
  await expect(page.getByTestId('tab-careers-listings')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('banner-demo')).toHaveCount(1);
  await expect(page.getByText('About the sample listings below', { exact: true })).toHaveCount(0);
  await expect(page.locator('.jobs-demo-flag, .job-demo-chip, .jobs-footnote')).toHaveCount(0);
  await page.getByTestId('tab-careers-listings').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/tab=matched-roles$/);
  await page.goBack();
  await expect(page.getByTestId('tab-careers-listings')).toHaveAttribute('aria-selected', 'true');
  await page.goto('/careers-and-jobs?tab=career-paths');
  await expect(page.locator('[data-testid^="sdg-tags-"], [data-testid^="text-sdg-none-"]').first()).toBeVisible();
  await expect(page.locator('[data-testid^="panel-ai-"]')).toHaveCount(0);
  const trigger = page.getByTestId('button-open-ai-career-explorer');
  await trigger.click();
  await expect(page.getByTestId('drawer-ai')).toBeVisible();
  await expect(page.getByTestId('panel-ai-career-explorer')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('drawer-ai')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
