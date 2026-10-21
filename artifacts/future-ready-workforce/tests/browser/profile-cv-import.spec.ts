import { expect, test, type Page } from '@playwright/test';

const storageKey = 'frw-demo-workspace-v1';

type StoredProfile = {
  occupation: string;
  education: string;
  skills: { name: string; level: number; cvDetected?: boolean }[];
};

async function storedAdultProfile(page: Page): Promise<StoredProfile | null> {
  return page.evaluate(key => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const workspace = JSON.parse(raw) as { profiles?: { adult?: StoredProfile } };
    return workspace.profiles?.adult ?? null;
  }, storageKey);
}

async function setInitialProfile(page: Page) {
  await page.goto('/profile');
  await page.getByTestId('input-occupation').fill('Existing occupation');
  await page.getByTestId('input-education').fill('Existing education');
  await page.getByTestId('button-save-profile').click();
  await expect.poll(() => storedAdultProfile(page)).toMatchObject({
    occupation: 'Existing occupation',
    education: 'Existing education',
  });
}

async function mockCvResponse(
  page: Page,
  response: { skills: string[]; warnings: string[]; profileSuggestions: Record<string, unknown> },
) {
  await page.route('**/api/career/cv-skills', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(response),
  }));
}

async function uploadSyntheticCv(page: Page) {
  await page.getByTestId('input-profile-cv').setInputFiles({
    name: 'synthetic-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic test document; no personal data.'),
  });
  await expect(page.getByTestId('dialog-cv-review')).toBeVisible();
}

test('new and reset profiles show blank About You fields with gray examples', async ({ page }) => {
  await page.goto('/profile');

  const adultFields = [
    ['input-occupation', 'e.g., Operations coordinator'],
    ['input-experience', 'e.g., 4'],
    ['input-education', 'e.g., Diploma in Business'],
    ['input-interests', 'e.g., Data, service design'],
    ['input-location', 'e.g., Kuala Lumpur'],
    ['input-learning-hours', 'e.g., 5'],
    ['input-budget', 'e.g., 200'],
    ['input-goals', 'e.g., Move into a data analyst role'],
  ] as const;
  for (const [testId, placeholder] of adultFields) {
    const field = page.getByTestId(testId);
    await expect(field).toHaveValue('');
    await expect(field).toHaveAttribute('placeholder', placeholder);
  }

  const occupation = page.getByTestId('input-occupation');
  expect(await occupation.evaluate(element => getComputedStyle(element, '::placeholder').color)).toBe('rgb(124, 113, 105)');
  await occupation.fill('Operations coordinator');
  expect(await occupation.evaluate(element => element.matches(':placeholder-shown'))).toBe(false);

  const preference = page.getByTestId('select-work-preference');
  await expect(preference).toHaveValue('');
  await expect(preference).toHaveClass(/is-placeholder/);
  expect(await preference.evaluate(element => getComputedStyle(element).color)).toBe('rgb(124, 113, 105)');
  await preference.selectOption('Hybrid');
  await expect(preference).not.toHaveClass(/is-placeholder/);

  await page.getByTestId('button-save-profile').click();
  await page.getByTestId('button-reset-profile').click();
  await page.getByTestId('button-confirm-reset').click();
  await expect(page.getByTestId('input-occupation')).toHaveValue('');
  await expect(page.getByTestId('input-experience')).toHaveValue('');
  await expect(page.getByTestId('select-work-preference')).toHaveValue('');
  await page.getByTestId('button-save-profile').click();
  await page.reload();
  await expect(page.getByTestId('input-occupation')).toHaveValue('');
  await expect(page.getByTestId('input-experience')).toHaveValue('');
  await expect(page.getByTestId('select-work-preference')).toHaveValue('');

  await page.locator('#side').selectOption('graduate');
  await expect(page.getByTestId('input-qualification')).toHaveValue('');
  await expect(page.getByTestId('input-qualification')).toHaveAttribute('placeholder', 'e.g., Diploma');
  await expect(page.getByTestId('input-study-field')).toHaveValue('');
  await expect(page.getByTestId('input-study-field')).toHaveAttribute('placeholder', 'e.g., Business information systems');
});

test('applies only checked About You fields, retains pending skills, then saves and reloads', async ({ page }) => {
  await setInitialProfile(page);
  await mockCvResponse(page, {
    skills: ['AI literacy'],
    warnings: [],
    profileSuggestions: {
      occupation: 'CV suggested role',
      education: 'CV suggested education',
    },
  });

  await uploadSyntheticCv(page);
  await page.getByRole('checkbox', { name: 'Apply Education from CV' }).uncheck();
  await page.getByTestId('button-apply-cv-profile-only').click();

  await expect(page.getByTestId('dialog-cv-review')).not.toBeVisible();
  await expect(page.getByTestId('input-occupation')).toHaveValue('CV suggested role');
  await expect(page.getByTestId('input-education')).toHaveValue('Existing education');
  await expect(page.locator('[data-testid^="input-skill-name-"]')).toHaveCount(4);
  await expect.poll(() => storedAdultProfile(page)).toMatchObject({
    occupation: 'Existing occupation',
    education: 'Existing education',
  });

  await page.getByTestId('button-open-cv-review').click();
  await expect(page.getByTestId('dialog-cv-review')).toBeVisible();
  await expect(page.getByLabel('Proficiency level for AI literacy')).toBeVisible();
  await page.getByLabel('Proficiency level for AI literacy').focus();
  await page.getByLabel('Proficiency level for AI literacy').press('ArrowRight');
  await page.getByLabel('Proficiency level for AI literacy').press('ArrowRight');
  await page.getByLabel('Proficiency level for AI literacy').press('ArrowRight');
  await expect(page.getByLabel('Proficiency level for AI literacy')).toHaveAttribute('aria-valuetext', '4: Confident');
  await page.getByTestId('button-apply-cv-skills').click();
  await expect(page.getByTestId('dialog-cv-review')).not.toBeVisible();

  await page.getByTestId('button-save-profile').click();
  await expect.poll(() => storedAdultProfile(page)).toMatchObject({
    occupation: 'CV suggested role',
    education: 'Existing education',
    skills: expect.arrayContaining([expect.objectContaining({
      name: 'AI literacy',
      level: 4,
      cvDetected: true,
    })]),
  });

  await page.reload();
  await expect(page.getByTestId('input-occupation')).toHaveValue('CV suggested role');
  await expect(page.getByTestId('input-education')).toHaveValue('Existing education');
  await expect.poll(() => page.locator('[data-testid^="input-skill-name-"]').evaluateAll(
    inputs => inputs.map(input => (input as HTMLInputElement).value),
  )).toContain('AI literacy');
});

test('does not change profile fields when the CV has no About You suggestions', async ({ page }) => {
  await setInitialProfile(page);
  await mockCvResponse(page, { skills: [], warnings: [], profileSuggestions: {} });

  await uploadSyntheticCv(page);
  await expect(page.getByTestId('dialog-cv-review')).toContainText(
    'No clearly labelled About You details were found, so no profile fields will be changed.',
  );
  await expect(page.getByTestId('button-apply-cv-skills')).toHaveCount(0);
  await expect(page.getByTestId('button-apply-cv-profile-only')).toHaveCount(0);
  await expect(page.getByTestId('input-occupation')).toHaveValue('Existing occupation');
  await expect(page.getByTestId('input-education')).toHaveValue('Existing education');

  await page.getByRole('button', { name: 'Back to profile' }).click();
  await page.getByTestId('button-save-profile').click();
  await expect.poll(() => storedAdultProfile(page)).toMatchObject({
    occupation: 'Existing occupation',
    education: 'Existing education',
  });

  await page.reload();
  await expect(page.getByTestId('input-occupation')).toHaveValue('Existing occupation');
  await expect(page.getByTestId('input-education')).toHaveValue('Existing education');
});
