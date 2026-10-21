import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByTestId('input-occupation')).toBeVisible();
});

test('tracks completeness and offers clickable demo skill suggestions after occupation entry', async ({ page }) => {
  const progress = page.getByTestId('progress-profile-completeness');
  const before = Number(await progress.getAttribute('aria-valuenow'));

  await expect(page.getByTestId('input-occupation')).toHaveAttribute('placeholder', 'e.g., Operations coordinator');
  await page.getByTestId('input-occupation').fill('Operations coordinator');
  await expect(page.getByTestId('suggested-skills-panel')).toBeVisible();

  const after = Number(await progress.getAttribute('aria-valuenow'));
  expect(after).toBeGreaterThan(before);
  await expect(page.getByTestId('text-profile-completeness')).toContainText(`Profile is ${after}% complete`);

  const suggestions = page.locator('[data-testid^="button-suggested-skill-"]');
  const suggestionCount = await suggestions.count();
  expect(suggestionCount).toBeGreaterThanOrEqual(3);
  expect(suggestionCount).toBeLessThanOrEqual(5);

  const skillCount = await page.locator('[data-testid^="row-skill-"]').count();
  const suggestedName = (await suggestions.first().innerText()).replace(/^\+\s*/, '').trim();
  await suggestions.first().click();
  await expect(page.getByTestId(`input-skill-name-${skillCount}`)).toHaveValue(suggestedName);
  await expect(page.getByTestId(`select-skill-level-${skillCount}-range`)).toHaveValue('1');
  await expect(page.getByTestId('suggested-skills-panel')).toContainText('not market evidence');
});

test('shows About You and Skills guidance from accessible info controls', async ({ page }) => {
  const aboutInfo = page.getByTestId('info-about-you');
  await aboutInfo.click();
  await expect(page.getByText(/do not change your readiness score/)).toBeVisible();

  const skillsInfo = page.getByTestId('info-skills');
  await skillsInfo.click();
  await expect(page.getByText(/1 is new to it and 5 means you can teach it/)).toBeVisible();
});

test('uses an accessible stepped chili range and sticky save action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const rating = page.getByTestId('select-skill-level-0-range');
  await expect(rating).toHaveAttribute('type', 'range');
  await expect(rating).toHaveAttribute('min', '1');
  await expect(rating).toHaveAttribute('max', '5');

  const saveButton = page.getByTestId('button-save-profile');
  await expect(saveButton).toBeVisible();
  expect(await saveButton.evaluate(element => getComputedStyle(element.parentElement!).position)).toBe('sticky');
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect(saveButton).toBeInViewport();
});

test('LinkedIn import is clearly presented as an unavailable UI preview', async ({ page }) => {
  await page.getByTestId('button-linkedin-import').click();
  const dialog = page.getByTestId('dialog-linkedin-preview');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('UI preview only');
  await expect(dialog).toContainText('No account connection or profile data access is configured');
  await page.getByTestId('button-close-linkedin-preview').click();
  await expect(dialog).toBeHidden();
});
