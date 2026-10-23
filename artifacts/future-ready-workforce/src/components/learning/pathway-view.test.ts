import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PathwayView, type PathwayViewProps } from './pathway-view';
import { buildPathway } from '../../domain/reskilling-pathway';
import type { CourseResource } from '../../domain/resource-catalog';

/** Fictional resource, never added to the public catalogue. */
const resource: CourseResource = {
  id: 'test', title: 'Synthetic course', provider: 'Test provider',
  url: 'https://example.invalid/course', sourceUrl: 'https://example.invalid/source',
  cost: 'HRD Corp-claimable', costMYR: null, hours: null, level: 'Beginner',
  skills: ['Critical Thinking'], sdgs: [4], verified_on: '2026-10-23',
  status: 'verified', coverage: 'Test only', timeBasis: 'Test only', costCaveat: 'Test only',
};

function render(catalog: CourseResource[], budget: number, freeOnly: boolean) {
  const plan = buildPathway({
    milestones: [{
      id: 'test-gap', skill: 'Critical Thinking', title: 'Test gap', provider: 'Test only',
      verifiedUrl: null, synthetic: true, durationHours: null, costMYR: null,
      prerequisites: [], priority: 'High', order: 1,
    }],
    roleId: 'test-role', roleTitle: 'Test role', signals: [], scenario: 'moderate',
    hoursPerWeek: 5, budgetMYR: budget, freeOnly, catalog,
    now: new Date('2026-10-23T00:00:00Z'),
  });
  const noop = () => {};
  const props: PathwayViewProps = {
    plan, targetTitle: 'Test role', hours: 5, budget, freeOnly, scenario: 'moderate',
    onHoursChange: noop, onBudgetChange: noop, onFreeOnlyChange: noop, onScenarioChange: noop,
    isDone: () => false, onToggle: noop, onReviewTwin: noop, onReset: noop,
    onAcceptChanges: noop, onKeepPlan: noop,
  };
  return renderToStaticMarkup(createElement(PathwayView, props));
}

test('unpriced reviewed course explains price uncertainty instead of suggesting a higher budget', () => {
  for (const freeOnly of [false, true]) {
    for (const budget of [0, 100000]) {
      const html = render([resource], budget, freeOnly);
      assert.match(html, /data-testid="text-price-unconfirmed-test-gap"/);
      assert.match(html, /Price unconfirmed/);
      assert.match(html, /Check the price with the provider/);
      assert.match(html, /Free access is not assumed/);
      assert.doesNotMatch(html, /Raise the budget|turn off free-only|No match within your budget/);
      assert.doesNotMatch(html, /data-testid="link-course-test-gap"/);
    }
  }
});

test('known-priced budget and free-only exclusions retain the budget message, even with an unpriced option first', () => {
  const paid = { ...resource, id: 'paid', title: 'Synthetic paid course', costMYR: 30, hours: 2 };
  for (const [budget, freeOnly] of [[0, false], [100, true]] as const) {
    const html = render([resource, paid], budget, freeOnly);
    assert.match(html, /data-testid="text-budget-test-gap"/);
    assert.match(html, /No match within your budget/);
    assert.match(html, /Synthetic paid course/);
    assert.match(html, /Raise the budget or turn off free-only/);
    assert.doesNotMatch(html, /Price unconfirmed/);
  }
});
