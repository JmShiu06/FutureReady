import { expect, test, type Page } from '@playwright/test';

const storageKey = 'frw-demo-workspace-v1';

async function storedAdultProfile(page: Page) {
  return page.evaluate(key => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const workspace = JSON.parse(raw) as {
      profiles?: { adult?: { occupation?: string; education?: string; skills?: { name: string; level: number }[] } };
    };
    return workspace.profiles?.adult ?? null;
  }, storageKey);
}

test('CV review adds confirmed skills without exposing or changing About You details', async ({ page }) => {
  const skillName = 'CV-reviewed skill';
  const aiRequests: unknown[] = [];
  await page.route('**/api/career/cv-skills', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      skills: [skillName],
      warnings: [],
      profileSuggestions: { occupation: 'Must not be displayed or applied', education: 'Private field' },
    }),
  }));
  await page.route('**/api/ai/explanations', async route => {
    aiRequests.push(JSON.parse(route.request().postData() ?? '{}'));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        explanation: 'Python is commonly used to automate data preparation and build scripts.',
        sampleLabel: 'CV-detected skill',
        contextSummary: ['Only one detected skill name was sent.'],
        evidence: [],
        synthetic: false,
        finalAnswerOnly: true,
      }),
    });
  });

  await page.goto('/my-profile');
  await expect(page.getByTestId('input-occupation')).toHaveCount(0);
  await expect(page.getByTestId('input-education')).toHaveCount(0);
  await expect(page.getByTestId('button-save-profile')).toBeVisible();

  await page.getByTestId('input-profile-cv').setInputFiles({
    name: 'synthetic-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic test document; no personal data.'),
  });
  const review = page.getByTestId('dialog-cv-review');
  await expect(review).toBeVisible();
  await expect(review).toContainText(skillName);
  await expect(review).not.toContainText(/About You|Must not be displayed|Private field/i);
  await review.getByTestId('button-ai-explain-cv-skill-0').click();
  await expect(review).not.toBeVisible();
  await expect(page.getByTestId('drawer-ai')).toBeVisible();
  await expect(page.getByTestId('panel-ai-cv-analysis')).toContainText(skillName);
  await page.getByTestId('button-ai-demo-cv-analysis').click();
  await expect(page.getByTestId('result-ai-cv-analysis')).toContainText('commonly used');
  expect(aiRequests).toEqual([{ feature: 'cv-analysis', cvDetectedSkill: skillName }]);
  await page.getByTestId('button-close-ai-drawer').click();
  await expect(review).toBeVisible();

  const level = page.getByTestId('cv-skill-level-0-range');
  await level.focus();
  await level.press('Home');
  await page.getByTestId('button-apply-cv-skills').click();
  await page.getByTestId('button-save-profile').click();

  await expect.poll(() => storedAdultProfile(page)).toMatchObject({ occupation: '', education: '' });
  await expect.poll(async () => (await storedAdultProfile(page))?.skills?.find(skill => skill.name === skillName))
    .toMatchObject({ name: skillName, level: 1 });
  await page.reload();
  await expect(page.getByTestId('input-occupation')).toHaveCount(0);
  await expect.poll(() => page.locator('[data-testid^="input-skill-name-"]').evaluateAll(
    (inputs, name) => inputs.some(input => (input as HTMLInputElement).value === name),
    skillName,
  )).toBe(true);
});
