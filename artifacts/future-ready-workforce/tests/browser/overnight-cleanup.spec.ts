import { expect, test } from '@playwright/test';

test('AI and labour-market trends expose seven real-data date windows without synthetic history', async ({ page }) => {
  await page.goto('/trends');
  await expect(page.getByRole('heading', { name: 'AI & Labour Market Trends' })).toBeVisible();
  await expect(page.getByTestId('panel-synthetic-examples')).toHaveCount(0);
  await expect(page.getByTestId('section-synthetic-radar')).toHaveCount(0);

  const chart = page.getByTestId('chart-dosm-labour-force');
  await expect(chart).toBeVisible();
  const ranges = ['3m', '5m', '10m', '1y', '3y', '5y', '10y'];
  let previousCount = 0;
  for (const range of ranges) {
    const button = page.getByTestId(`button-dosm-range-${range}`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(chart).toHaveAttribute('data-range', range);
    const count = Number(await chart.getAttribute('data-observation-count'));
    expect(count).toBeGreaterThan(previousCount);
    expect(await chart.getAttribute('data-end-date')).toBe(await chart.getAttribute('data-latest-observation-date'));
    expect(await chart.getAttribute('data-start-date')).not.toBe('');
    previousCount = count;
  }

  const labourForcePanel = page.getByTestId('panel-dosm-labour-force');
  await expect(labourForcePanel).toContainText('2.9%');
  await expect(page.getByTestId('panel-dosm-job-market')).toContainText('626.9K');
  await expect(page.getByTestId('panel-dosm-job-market')).toContainText('555.5K');
  const skillFrequencyPanel = page.getByTestId('panel-skill-frequencies');
  await expect(skillFrequencyPanel).toBeVisible();
  await expect(skillFrequencyPanel).not.toContainText(/\d+\.\d{2,}%/);
});

test('a date range longer than the available source history is labelled honestly', async ({ page }) => {
  await page.route('**/api/dosm/labour-force**', async route => {
    const response = await route.fetch();
    const source = await response.json() as { observations: Array<{ date: string }>; [key: string]: unknown };
    await route.fulfill({
      response,
      body: JSON.stringify({ ...source, observations: source.observations.slice(-5) }),
    });
  });

  await page.goto('/trends');
  const chart = page.getByTestId('chart-dosm-labour-force');
  await expect(chart).toBeVisible();
  await page.getByTestId('button-dosm-range-10y').click();
  await expect(chart).toHaveAttribute('data-range', '10y');
  await expect(chart).toHaveAttribute('data-observation-count', '5');
  await expect(page.getByTestId('text-dosm-range-summary')).toContainText('only available history is shown');
});

test('the recommendation label, comparison, and real progress remain while demo UI is gone', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByTestId('card-cv-import')).toBeVisible();
  await expect(page.getByTestId('select-sample-variant')).toHaveCount(0);
  await expect(page.getByTestId('input-skill-name-0')).toBeVisible();

  await page.goto('/profile?section=twin');
  await expect(page.getByTestId('section-twin-progress')).toBeVisible();
  await expect(page.getByTestId('section-twin-progress')).toContainText('No roadmap to compare yet');
  await expect(page.getByTestId('section-simulator')).toHaveCount(0);

  await page.goto('/careers');
  const occupationPanel = page.getByTestId('panel-official-occupations');
  const comparisonPanel = page.getByTestId('panel-comparison');
  await expect(occupationPanel).toBeVisible();
  await expect(comparisonPanel).toBeVisible();
  await expect(page.getByTestId('select-compare-a')).toBeVisible();
  const occupationBox = await occupationPanel.boundingBox();
  const comparisonBox = await comparisonPanel.boundingBox();
  expect(occupationBox).not.toBeNull();
  expect(comparisonBox).not.toBeNull();
  expect(occupationBox!.y + occupationBox!.height).toBeLessThanOrEqual(comparisonBox!.y);
  await expect(page.getByTestId('text-methodology')).toHaveCount(0);
  await expect(page.getByTestId('panel-evidence')).toHaveCount(0);
  for (const roleId of ['ai-operations', 'service-designer', 'learning-partner', 'workforce-analyst']) {
    await expect(page.getByTestId(`card-career-${roleId}`)).toHaveCount(0);
  }
  const firstOccupation = page.getByTestId('select-compare-a');
  const secondOccupation = page.getByTestId('select-compare-b');
  await expect(firstOccupation).toBeEnabled();
  await expect(firstOccupation).toHaveValue('');
  await expect(secondOccupation).toHaveValue('');
  await expect(page.getByTestId('card-compare-0')).toHaveCount(0);
  await expect(page.getByTestId('card-compare-1')).toHaveCount(0);
  await firstOccupation.selectOption('mycol-2512');
  await expect(page.getByTestId('card-compare-0')).toContainText('Software Developers');
  await expect(page.getByTestId('text-compare-empty-1')).toBeVisible();
  await secondOccupation.selectOption('mycol-2524');
  await expect(page.getByTestId('card-compare-1')).toContainText('Data Professionals');
  await secondOccupation.selectOption('mycol-2413');
  await expect(page.getByTestId('text-compare-excluded-1')).toContainText('no skill ratings');

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Job Recommendations' })).toBeVisible();
  await page.getByRole('link', { name: 'Job Recommendations' }).click();
  await expect(page).toHaveURL(/\/cv-analysis$/);
  await expect(page.getByRole('heading', { name: 'Your job recommendations' })).toBeVisible();
});
