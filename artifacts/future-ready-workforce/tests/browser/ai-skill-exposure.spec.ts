import { expect, test } from '@playwright/test';

test('AI skill check asks for profile skills before assessing task exposure', async ({ page }) => {
  await page.addInitScript(() => {
    const profile = {
      id: 'adult', audience: 'adult', occupation: '', experienceYears: null, education: '',
      qualification: '', studyField: '', interests: [], skills: [],
      location: '', workPreference: '', learningHours: null, budgetMYR: null, goals: '',
    };
    window.localStorage.setItem('frw-demo-workspace-v1', JSON.stringify({
      version: 1,
      audience: 'adult',
      profiles: { adult: profile },
      targets: { adult: 'service-designer' },
      completion: {},
      baselines: {},
      completedAt: {},
      confirmations: [],
    }));
  });
  await page.goto('/scenarios');

  await expect(page.getByRole('heading', { name: 'Could AI easily replace your skills?' })).toBeVisible();
  await expect(page.getByTestId('panel-ai-exposure-boundary')).toContainText('a validated exposure dataset');
  await expect(page.getByTestId('state-no-ai-skills')).toBeVisible();
  await expect(page.getByTestId('link-ai-check-profile')).toHaveAttribute('href', '/profile');
});

test('task descriptions change qualitative AI exposure without changing saved profile skills', async ({ page }) => {
  const skills = [
    { name: 'Data entry', level: 3, category: 'Digital' },
    { name: 'Facilitation', level: 4, category: 'People' },
  ];
  await page.addInitScript(savedSkills => {
    const profile = {
      id: 'adult', audience: 'adult', occupation: '', experienceYears: null, education: '',
      qualification: '', studyField: '', interests: [], skills: savedSkills,
      location: '', workPreference: '', learningHours: null, budgetMYR: null, goals: '',
    };
    window.localStorage.setItem('frw-demo-workspace-v1', JSON.stringify({
      version: 1,
      audience: 'adult',
      profiles: { adult: profile },
      targets: { adult: 'service-designer' },
      completion: {},
      baselines: {},
      completedAt: {},
      confirmations: [],
    }));
  }, skills);

  await page.goto('/scenarios');
  await expect(page.getByTestId('text-ai-exposure-0')).toHaveText('Not assessed');
  await expect(page.getByTestId('text-ai-exposure-1')).toHaveText('Not assessed');

  await page.getByTestId('card-ai-skill-0').getByText('Review tasks for this skill').click();
  await page.getByTestId('checkbox-ai-trait-0-repeatable').check();
  await page.getByTestId('checkbox-ai-trait-0-digital').check();
  await expect(page.getByTestId('text-ai-exposure-0')).toHaveText('More automatable task steps');

  await page.getByTestId('checkbox-ai-trait-0-judgement').check();
  await expect(page.getByTestId('text-ai-exposure-0')).toHaveText('AI may assist with parts');

  await page.getByTestId('card-ai-skill-1').getByText('Review tasks for this skill').click();
  await page.getByTestId('checkbox-ai-trait-1-people').check();
  await expect(page.getByTestId('text-ai-exposure-1')).toHaveText('More human-led work');

  const savedNames = await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('frw-demo-workspace-v1') ?? '{}') as {
      profiles?: { adult?: { skills?: { name: string }[] } };
    };
    return saved.profiles?.adult?.skills?.map(skill => skill.name);
  });
  expect(savedNames).toEqual(['Data entry', 'Facilitation']);
  await expect(page.getByTestId('text-ai-exposure-method')).toContainText('not whether a job will disappear');
});
