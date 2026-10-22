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
  const names = ['Mina Tan', 'Nura Ismail'];
  await page.route('**/api/career/cv-skills', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      skills: [skillName],
      warnings: [],
      detectedName: names.shift() ?? 'Unknown',
      profileSuggestions: { occupation: 'Must not be displayed or applied', education: 'Private field' },
      careerData: {
        skills: [skillName], education: [], workExperience: [], certifications: ['Workplace safety certificate'],
        projects: [], languages: [], extractionLimited: false,
      },
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
  await expect(page.getByTestId('text-candidate-badge')).toContainText('Candidate: Mina Tan');
  await expect(page.getByTestId('text-shell-name')).toHaveText('Mina Tan');
  await expect(page.getByRole('heading', { name: 'Your starting point.' })).toBeVisible();
  const review = page.getByTestId('dialog-cv-review');
  await expect(review).toBeVisible();
  await expect(review).toContainText(skillName);
  await expect(review).toContainText('Workplace safety certificate');
  await expect(review).not.toContainText(/About You|Must not be displayed|Private field/i);
  await review.getByTestId('button-ai-explain-cv-skill-0').click();
  await expect(review).not.toBeVisible();
  await expect(page.getByTestId('drawer-ai')).toBeVisible();
  await expect(page.getByTestId('panel-ai-cv-analysis')).toContainText(skillName);
  await page.getByTestId('button-ai-demo-cv-analysis').click();
  await expect(page.getByTestId('result-ai-cv-analysis')).toContainText('commonly used');
  expect(aiRequests).toEqual([{ feature: 'cv-analysis', cvDetectedSkill: skillName }]);
  expect(JSON.stringify(aiRequests)).not.toContain('Mina Tan');
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
  await page.screenshot({ path: '/tmp/candidate-badge-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  const badgeBox = await page.getByTestId('text-candidate-badge').boundingBox();
  expect(badgeBox).not.toBeNull();
  expect(badgeBox!.x).toBeGreaterThanOrEqual(0);
  expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '/tmp/candidate-badge-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByTestId('link-nav-market-and-ai-impact').click();
  await page.getByRole('tab', { name: 'AI Explanation', exact: true }).click();
  await expect(page.getByTestId('text-candidate-explanation')).toContainText('Candidate: Mina Tan');
  await page.getByTestId('link-nav-careers-and-jobs').click();
  await page.getByRole('tab', { name: 'Matched roles', exact: true }).click();
  await expect(page.getByTestId('text-candidate-job-matching')).toContainText('Candidate: Mina Tan');
  await page.getByTestId('link-nav-my-profile').click();
  await page.getByTestId('input-profile-cv').setInputFiles({
    name: 'replacement-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Second synthetic CV without personal details.'),
  });
  await expect(page.getByTestId('text-candidate-badge')).toContainText('Candidate: Nura Ismail');
  await expect(page.getByTestId('text-shell-name')).toHaveText('Nura Ismail');
  await expect(page.getByRole('heading', { name: 'Your starting point.' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('text-candidate-badge')).toHaveCount(0);
  await expect(page.getByTestId('text-shell-name')).toHaveText('Your profile');
  await expect(page.getByRole('heading', { name: 'Your starting point.' })).toBeVisible();
  await expect(page.getByTestId('input-occupation')).toHaveCount(0);
  await expect.poll(() => page.locator('[data-testid^="input-skill-name-"]').evaluateAll(
    (inputs, name) => inputs.some(input => (input as HTMLInputElement).value === name),
    skillName,
  )).toBe(true);
});

test('a successful parse without a detected name displays the explicit unknown fallback', async ({ page }) => {
  await page.route('**/api/career/cv-skills', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      skills: [],
      warnings: [],
      careerData: {
        skills: [], education: [], workExperience: [], certifications: [],
        projects: [], languages: [], extractionLimited: true,
      },
    }),
  }));
  await page.goto('/my-profile');
  await page.getByTestId('input-profile-cv').setInputFiles({
    name: 'resume-no-name.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Professional summary and work experience with details, but no personal name.'),
  });
  await expect(page.getByTestId('text-candidate-badge')).toContainText('Candidate: Unknown');
  await expect(page.getByTestId('text-shell-name')).toHaveText('Unknown');
  await expect(page.getByRole('heading', { name: 'Your starting point.' })).toBeVisible();
});

test('the raccoon loader appears while CV parsing and stops moving for reduced-motion users', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/api/career/cv-skills', async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        skills: [],
        warnings: [],
        careerData: {
          skills: [], education: [], workExperience: [], certifications: [],
          projects: [], languages: [], extractionLimited: true,
        },
      }),
    });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/my-profile');
  await page.getByTestId('input-profile-cv').setInputFiles({
    name: 'loading-state-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic resume for loader testing.'),
  });

  const loader = page.locator('.profile-cv-drop > .raccoon-loader');
  await expect(loader).toBeVisible();
  const head = loader.locator('.raccoon-head');
  const animationName = await head.evaluate(element => getComputedStyle(element).animationName);
  expect(animationName).not.toBe('none');
  await page.screenshot({ path: '/tmp/raccoon-loader-mobile.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => head.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await expect(page.getByTestId('dialog-cv-review')).toBeVisible();
});
