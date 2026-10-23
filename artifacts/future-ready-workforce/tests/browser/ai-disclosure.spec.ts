import { expect, test } from '@playwright/test';

test('disclosure page uses live public metadata and distinguishes local CV processing', async ({ page }) => {
  const response = await page.request.get('/api/ai-info');
  expect(response.status()).toBe(200);
  const info = await response.json();
  expect(info.modelId).toBeTruthy();
  let generationRequests = 0;
  await page.route('**/api/ai/**', route => { generationRequests++; return route.abort(); });
  await page.goto('/ai-disclosure');
  await expect(page.getByTestId('text-ai-provider')).toHaveText(info.provider);
  await expect(page.getByTestId('text-ai-model-id')).toHaveText(info.modelId);
  for (const feature of info.features) {
    await expect(page.getByTestId(`card-ai-feature-${feature.id}`)).toBeVisible();
  }
  await expect(page.getByTestId('card-ai-feature-cv-extraction')).toContainText('No language model');
  await expect(page.getByTestId('card-ai-feature-skill-learning-guidance')).toContainText('Reuses');
  expect(generationRequests).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('market button, consent and generated output disclose current versus actual stamped model', async ({ page }) => {
  const info = await (await page.request.get('/api/ai-info')).json();
  let mockedGenerations = 0;
  await page.route('**/api/ai/**', async route => {
    expect(route.request().url()).toContain('/ai/explanations');
    mockedGenerations++;
    await route.fulfill({
      json: {
        explanation: 'Fictional market narrative supplied only by an offline test transport.',
        sampleLabel: 'Fictional test example', contextSummary: [], evidence: [],
        synthetic: true, finalAnswerOnly: true,
        aiModel: { provider: 'Offline test transport', modelId: 'Fixture/Original-Output-Model' },
      },
    });
  });
  await page.goto('/market-and-ai-impact');
  await expect(page.getByTestId('label-ai-model-button-market-trends')).toContainText(info.modelId);
  await page.getByTestId('button-open-ai-market-trends').click();
  await expect(page.getByTestId('label-ai-model-drawer')).toContainText(info.modelId);
  await expect(page.getByTestId('text-ai-consent-model-market-trends')).toContainText(`${info.provider} ${info.modelId}`);
  expect(mockedGenerations).toBe(0);
  await page.getByTestId('button-ai-demo-market-trends').click();
  await expect(page.getByTestId('label-ai-model-result-market-trends')).toContainText('Fixture/Original-Output-Model');
  await expect(page.getByTestId('label-ai-model-result-market-trends')).not.toContainText(info.modelId);
  expect(mockedGenerations).toBe(1);
});

test('saved-skill analysis and reused learning guidance each show the stamped model with explicit consent', async ({ page }) => {
  await page.addInitScript(() => {
    const profile = {
      id: 'adult', audience: 'adult', occupation: '', experienceYears: null, education: '',
      qualification: '', studyField: '', interests: [],
      skills: [{ name: 'Critical Thinking', level: 3, category: 'Cognitive' }],
      location: '', workPreference: '', learningHours: null, budgetMYR: null, goals: '',
    };
    localStorage.setItem('frw-demo-workspace-v1', JSON.stringify({
      version: 1, audience: 'adult', profiles: { adult: profile },
      targets: {}, completion: {}, baselines: {}, completedAt: {}, confirmations: [],
    }));
  });
  let mockedGenerations = 0;
  await page.route('**/api/ai/**', async route => {
    expect(route.request().url()).toContain('/ai/cv-career-explanation');
    mockedGenerations++;
    await route.fulfill({ json: {
      sections: {
        skillAnalysis: 'Fictional analysis for a selected skill.',
        careerMatchAnalysis: 'Fictional role context.',
        skillGapAnalysis: 'Fictional learning gap.',
        improvementSuggestions: 'Fictional practice guidance.',
        strengths: 'Fictional strength.', areasForGrowth: 'Fictional growth area.',
      },
      matches: [], resources: [], warnings: [],
      aiModel: { provider: 'Offline test transport', modelId: 'Fixture/Analysis-Output-Model' },
    } });
  });
  await page.goto('/market-and-ai-impact?tab=ai-impact');
  await expect(page.getByTestId('label-ai-model-cvx-button')).toContainText('AI-generated');
  await expect(page.getByTestId('text-cvx-consent-model')).toContainText('1 selected saved skill names');
  await expect(page.getByTestId('button-cvx-generate')).toBeDisabled();
  expect(mockedGenerations).toBe(0);
  await page.getByTestId('checkbox-cvx-consent').check();
  await page.getByTestId('button-cvx-generate').click();
  await expect(page.getByTestId('label-ai-model-cvx-result')).toContainText('Fixture/Analysis-Output-Model');
  await page.getByTestId('link-nav-learning-roadmap').click();
  await page.locator('a[href="/learning-roadmap/skill-guidance"]').first().click();
  await expect(page.getByTestId('label-ai-model-cvx-learning')).toContainText('Fixture/Analysis-Output-Model');
  expect(mockedGenerations).toBe(1);
});

test('local fictional CV review labels optional AI without sending its file or text to a model', async ({ page }) => {
  const info = await (await page.request.get('/api/ai-info')).json();
  let generationRequests = 0;
  await page.route('**/api/ai/**', route => { generationRequests++; return route.abort(); });
  await page.goto('/my-profile');
  await page.getByTestId('input-profile-cv').setInputFiles({
    name: 'fictional-disclosure-test.txt', mimeType: 'text/plain',
    buffer: Buffer.from('Fictional demonstration only.\nSkills: Python, SQL, Excel, Critical Thinking, Active Learning.\nPractice: Built a fictional data exercise using Python and SQL. No real personal information is included.'),
  });
  await expect(page.getByTestId('dialog-cv-review')).toBeVisible();
  await expect(page.getByTestId('label-ai-model-cv-skill-explain')).toContainText(info.modelId);
  expect(generationRequests).toBe(0);
});
