import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/my-profile');
  await expect(page.getByTestId('button-save-profile')).toBeVisible();
});

test('keeps the skill editor and removes About You fields', async ({ page }) => {
  await expect(page.getByTestId('input-occupation')).toHaveCount(0);
  await expect(page.getByTestId('input-experience')).toHaveCount(0);
  await expect(page.getByTestId('progress-profile-completeness')).toHaveCount(0);
  await expect(page.getByTestId('select-sample-variant')).toHaveCount(0);
  await expect(page.getByText('Fictional sample profiles', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Skills', exact: true })).toBeVisible();
  await expect(page.getByTestId('input-new-skill')).toBeVisible();
  await expect(page.getByTestId('input-skill-name-0')).toBeVisible();
});

test('retains accessible proficiency guidance for Skills', async ({ page }) => {
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
