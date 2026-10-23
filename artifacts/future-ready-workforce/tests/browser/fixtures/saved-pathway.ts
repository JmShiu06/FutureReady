import { expect, test as base, type Page } from '@playwright/test';

export const workspaceKey = 'frw-demo-workspace-v1';
export const savedProfile = {
  id: 'adult', audience: 'adult', occupation: '',
  experienceYears: null, education: '', qualification: '',
  studyField: '', interests: [],
  skills: [{ name: 'Monitoring', level: 4, category: 'Synthetic saved skill' }],
  location: '', workPreference: '', learningHours: null, budgetMYR: null,
  goals: '',
};

// Deliberately fictional occupation evidence, never presented as a verified real role.
// Communication merges three milestones; the two core gaps swap under Fast AI.
const documentedSkills = [
  ['2.A.1.b', 'Active Listening', 3],
  ['2.A.1.c', 'Writing', 3],
  ['2.A.1.d', 'Speaking', 3],
  ['2.B.2.a', 'Critical Thinking', 3],
  ['2.B.5.a', 'Time Management', 3.5],
].map(([elementId, name, importance]) => ({
  elementId, name, importance, level: 4, levelLowPrecision: false,
}));
const occupationResult = {
  selectionRule: 'Synthetic regression fixture only',
  sources: { onet: { release: '31.0' } },
  occupations: [{
    id: 'synthetic-pathway', recommendationStatus: 'eligible',
    mycol: { title: 'Synthetic pathway test role', edition: 'Synthetic fixture', masco4: '2512' },
    mapping: { status: 'verified', limitations: 'Fictional mapping for local tests only' },
    onet: {
      code: '15-1252.00', title: 'Synthetic fixture',
      url: 'https://www.onetonline.org/link/summary/15-1252.00',
    },
    documentedSkills,
  }],
};
export const communicationKeys = ['2.A.1.b', '2.A.1.c', '2.A.1.d']
  .map(id => `adult:official:synthetic-pathway:${id}`);

function marketResponse(changed: boolean) {
  return {
    occupationGroups: ['Managers', 'Professionals'].map(label => ({
      label,
      observations: [
        { quarter: '2026-Q1', jobOfferings: 100, dataUrl: 'https://example.invalid/dosm-fixture' },
        {
          quarter: '2026-Q2', jobOfferings: changed && label === 'Professionals' ? 25 : 100,
          dataUrl: 'https://example.invalid/dosm-fixture',
        },
      ],
    })),
  };
}

export const test = base.extend<{ market: { changed: boolean } }>({
  market: async ({}, use) => { await use({ changed: false }); },
  page: async ({ page, market, baseURL }, use) => {
    const unexpected: string[] = [];
    const origin = new URL(baseURL!).origin;
    // Block service workers so no request can bypass the network isolation below.
    await page.context().route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/occupations/match' && request.method() === 'POST') {
          const body = request.postDataJSON();
          expect(Object.keys(body)).toEqual(['skills']);
          expect(body.skills.every((skill: string) => [
            'Reading Comprehension', 'Mathematics', 'Active Listening', 'Speaking', 'Writing',
            'Coordination', 'Monitoring', 'Time Management',
          ].includes(skill))).toBe(true);
          await route.fulfill({ json: occupationResult });
          return;
        }
        if (url.pathname === '/api/dosm/job-market-insights' && request.method() === 'GET') {
          await route.fulfill({ json: marketResponse(market.changed) });
          return;
        }
        unexpected.push(`${request.method()} ${url.pathname}`);
        await route.abort('blockedbyclient');
        return;
      }
      if (url.origin !== origin) {
        // External fonts/assets are optional; external service calls are not.
        if (['fetch', 'xhr'].includes(request.resourceType())) {
          unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
        }
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    await page.addInitScript(({ key, profile }) => {
      // Seed ONCE per test context, not on reload: otherwise persistence assertions
      // could pass against re-created state rather than what the app actually saved.
      if (sessionStorage.getItem('synthetic-pathway-seeded')) return;
      sessionStorage.setItem('synthetic-pathway-seeded', 'true');
      const profiles = Object.fromEntries(['adult', 'graduate', 'hr', 'education'].map(audience => [
        audience, { ...profile, id: audience, audience, skills: audience === 'adult' ? profile.skills : [] },
      ]));
      localStorage.setItem(key, JSON.stringify({
        version: 1, audience: 'adult', profiles,
        targets: {
          adult: 'service-designer', graduate: 'workforce-analyst',
          hr: 'ai-operations', education: 'learning-partner',
        }, completion: {}, completedAt: {},
        baselines: {}, confirmations: [],
      }));
      localStorage.setItem('frw-planning-scenario-v1', 'moderate');
    }, { key: workspaceKey, profile: savedProfile });
    await use(page);
    expect(unexpected, 'No generation, CV, paid, refresh or other unmocked API calls').toEqual([]);
  },
});

export async function workspace(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), workspaceKey);
}

export async function preferences(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('frw-pathway-v1:'));
    if (!key) throw new Error('The app has not saved pathway preferences');
    return JSON.parse(localStorage.getItem(key)!);
  });
}

export async function buildSample(page: Page, sample = 'it-graduate') {
  await page.goto('/learning-roadmap');
  await page.getByTestId(`radio-preset-${sample}`).check();
  await page.getByTestId('button-build-synthetic-pathway').click();
  await expect(page.getByTestId('pathway-view')).toBeVisible();
  await expect.poll(async () => (await preferences(page)).accepted.signals.length).toBe(2);
}

export async function stepOrder(page: Page) {
  return page.locator('[data-testid^="text-step-skill-"]').allTextContents();
}

export async function visiblePlanPriorities(page: Page) {
  // Read the rendered explanation, not the production scoring implementation.
  return page.locator('[data-testid^="details-why-"]').evaluateAll(details =>
    Object.fromEntries(details.map(detail => [
      detail.getAttribute('data-testid'),
      [...detail.querySelectorAll('dt')]
        .find(dt => dt.textContent === 'Gap priority')?.nextElementSibling?.textContent,
    ])),
  );
}

export async function completeCommunication(page: Page) {
  const card = page.locator('[data-testid^="card-step-"]')
    .filter({ hasText: 'Effective communication in the workplace' });
  await expect(card).toHaveCount(1);
  const checkbox = card.locator('input[type="checkbox"]');
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expect.poll(async () => {
    const state = await workspace(page);
    return communicationKeys.map(key => state.completion[key]);
  }).toEqual([true, true, true]);
  return checkbox;
}
