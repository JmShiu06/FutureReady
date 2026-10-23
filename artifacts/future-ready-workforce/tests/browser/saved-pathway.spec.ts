import { expect } from '@playwright/test';
import {
  test, buildSample, communicationKeys, completeCommunication, preferences,
  savedProfile, stepOrder, visiblePlanPriorities, workspace,
} from './fixtures/saved-pathway';

test.use({ serviceWorkers: 'block' });

for (const [sample, label, skills] of [
  ['it-graduate', 'Fresh IT graduate', ['Reading Comprehension', 'Mathematics']],
  ['admin-to-data', 'Admin worker switching to data', ['Active Listening', 'Speaking', 'Writing']],
  ['factory-supervisor', 'Factory supervisor upskilling', ['Coordination', 'Monitoring', 'Time Management']],
] as const) {
  test(`${label} creates a synthetic baseline without replacing the saved profile`, async ({ page }) => {
    await buildSample(page, sample);
    await expect(page.getByTestId('text-sample-label')).toContainText(label);
    const state = await workspace(page);
    expect(state.profiles.adult).toEqual(savedProfile);
    expect(Object.values(state.baselines)).toHaveLength(1);
    const baseline = state.baselines['adult:official:synthetic-pathway'];
    expect(baseline.skills.map((s: { name: string }) => s.name)).toEqual(skills);
    expect(baseline.sampleLabel).toBe(label);
    await page.reload();
    await expect(page.getByTestId('text-sample-label')).toContainText(label);
    expect((await workspace(page)).profiles.adult).toEqual(savedProfile);
    expect((await workspace(page)).baselines).toEqual(state.baselines);
  });
}

test('a multi-skill course and hours, budget and free-only controls survive reload', async ({ page }) => {
  await buildSample(page);
  const checkbox = await completeCommunication(page);
  const checkboxId = await checkbox.getAttribute('data-testid');
  const completed = await workspace(page);
  expect(Object.keys(completed.completion).sort()).toEqual([...communicationKeys].sort());
  expect(Object.keys(completed.completedAt).sort()).toEqual([...communicationKeys].sort());
  await expect(page.getByTestId('text-progress')).toContainText('1 of 4 steps done');
  await expect(page.getByRole('progressbar', { name: 'Pathway progress' })).toHaveAttribute('aria-valuenow', '25');

  // Playwright fill dispatches input/change on range inputs just like the slider.
  await page.getByTestId('input-hours').fill('8');
  await page.getByTestId('input-budget').fill('250');
  await page.getByTestId('checkbox-free-only').check();
  await expect(page.getByTestId('text-plan-time')).toContainText('at 8 hrs/week');
  await expect.poll(async () => {
    const p = await preferences(page);
    return [p.hours, p.budget, p.freeOnly];
  }).toEqual([8, 250, true]);
  await page.reload();
  await expect(page.getByTestId(checkboxId!)).toBeChecked();
  await expect(page.getByTestId('input-hours')).toHaveValue('8');
  await expect(page.getByTestId('input-budget')).toHaveValue('250');
  await expect(page.getByTestId('checkbox-free-only')).toBeChecked();
  await expect(page.getByTestId('text-plan-time')).toContainText('at 8 hrs/week');
  expect((await workspace(page)).completedAt).toEqual(completed.completedAt);
  expect((await workspace(page)).profiles.adult).toEqual(savedProfile);

  // Unchecking a merged course clears ALL its milestones, also after reload.
  await page.getByTestId(checkboxId!).uncheck();
  await expect.poll(async () => (await workspace(page)).completion).toEqual({});
  await page.reload();
  await expect(page.getByTestId(checkboxId!)).not.toBeChecked();
  expect((await workspace(page)).completedAt).toEqual({});
});

for (const change of ['scenario', 'mocked DOSM'] as const) {
  for (const decision of ['keep', 'apply'] as const) {
    test(`${change} priority changes require review; ${decision} preserves completion across reload`, async ({ page, market }) => {
      await buildSample(page);
      const checkbox = await completeCommunication(page);
      const checkboxId = await checkbox.getAttribute('data-testid');
      const before = await workspace(page);
      const originalOrder = await stepOrder(page);
      const originalPriorities = await visiblePlanPriorities(page);
      const accepted = (await preferences(page)).accepted;

      if (change === 'scenario') {
        await page.getByTestId('select-scenario').selectOption('fast');
      } else {
        market.changed = true; // Route fixture only; no DOSM refresh or mutation.
        await page.reload();
      }
      await expect(page.getByTestId('banner-pending-change')).toContainText(
        change === 'scenario' ? 'AI scenario is now Fast' : 'DOSM market snapshot changed',
      );
      expect(await stepOrder(page)).toEqual(originalOrder);
      expect(await visiblePlanPriorities(page)).toEqual(originalPriorities);
      expect((await preferences(page)).accepted).toEqual(accepted);
      await expect(page.getByTestId('button-apply-updates')).toHaveCount(0);
      await expect(page.getByTestId('button-keep-order')).toHaveCount(0);
      await expect(page.getByTestId(checkboxId!)).toBeChecked();

      // A reload must not silently accept a new scenario or market snapshot.
      await page.reload();
      await expect(page.getByTestId('banner-pending-change')).toBeVisible();
      expect(await stepOrder(page)).toEqual(originalOrder);
      expect(await visiblePlanPriorities(page)).toEqual(originalPriorities);
      expect((await preferences(page)).accepted).toEqual(accepted);
      await page.getByTestId('button-review-changes').click();
      await expect(page.getByTestId('list-pending-changes').locator('li')).not.toHaveCount(0);
      await page.getByTestId(decision === 'keep' ? 'button-keep-order' : 'button-apply-updates').click();
      await expect(page.getByTestId('banner-pending-change')).toHaveCount(0);
      await expect.poll(async () => {
        const p = await preferences(page);
        return decision === 'keep' ? !!p.ignoredFingerprint
          : change === 'scenario' ? p.accepted.scenario === 'fast'
            : p.accepted.signals.find((s: { group: string }) => s.group === 'professionals')?.latest === 25;
      }).toBe(true);
      const reviewed = await preferences(page);
      if (decision === 'keep') {
        expect(reviewed.accepted).toEqual(accepted);
        expect(await stepOrder(page)).toEqual(originalOrder);
        expect(await visiblePlanPriorities(page)).toEqual(originalPriorities);
      } else {
        expect(reviewed.ignoredFingerprint).toBeUndefined();
        expect(await visiblePlanPriorities(page)).not.toEqual(originalPriorities);
        if (change === 'scenario') {
          expect(reviewed.accepted.scenario).toBe('fast');
          expect(await stepOrder(page)).not.toEqual(originalOrder);
        } else {
          expect(reviewed.accepted.signals).not.toEqual(accepted.signals);
        }
      }
      const reviewedOrder = await stepOrder(page);
      const reviewedPriorities = await visiblePlanPriorities(page);
      await page.reload();
      await expect(page.getByTestId('pathway-view')).toBeVisible();
      await expect(page.getByTestId('banner-pending-change')).toHaveCount(0);
      expect(await stepOrder(page)).toEqual(reviewedOrder);
      expect(await visiblePlanPriorities(page)).toEqual(reviewedPriorities);
      expect(await preferences(page)).toEqual(reviewed);
      await expect(page.getByTestId(checkboxId!)).toBeChecked();
      const after = await workspace(page);
      expect(after.completion).toEqual(before.completion);
      expect(after.completedAt).toEqual(before.completedAt);
      expect(after.baselines).toEqual(before.baselines);
      expect(after.profiles.adult).toEqual(savedProfile);
      expect(after.confirmations).toEqual([]);
    });
  }
}
