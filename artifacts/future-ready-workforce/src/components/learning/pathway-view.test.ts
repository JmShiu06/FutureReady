import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PathwayView, type PathwayViewProps } from './pathway-view';
import { buildPathway } from '../../domain/reskilling-pathway';
import type { CourseResource } from '../../domain/resource-catalog';
import { I18nProvider } from '../../i18n/i18n-context';
import { LOCALES, LOCALE_STORAGE_KEY, interpolate, type Locale } from '../../i18n/locales';
import { translate } from '../../i18n/messages';

/** Fictional resource, never added to the public catalogue. */
const resource: CourseResource = {
  id: 'test', title: 'Synthetic course', provider: 'Test provider',
  url: 'https://example.invalid/course', sourceUrl: 'https://example.invalid/source',
  cost: 'HRD Corp-claimable', costMYR: null, hours: null, level: 'Beginner',
  skills: ['Critical Thinking'], sdgs: [4], verified_on: '2026-10-23',
  status: 'verified', coverage: 'Test only', timeBasis: 'Test only', costCaveat: 'Test only',
};

function render(catalog: CourseResource[], budget: number, freeOnly: boolean, locale: Locale = 'en') {
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
  // Only the locale preference is supplied; no workspace or progress storage is touched.
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: (key: string) => key === LOCALE_STORAGE_KEY ? locale : null },
  } });
  try {
    return renderToStaticMarkup(createElement(I18nProvider, null, createElement(PathwayView, props)));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
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

test('learning evidence controls translate in every locale while provider evidence stays verbatim', () => {
  const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
  const priced = { ...resource, costMYR: 30, hours: 2, coverage: 'Original coverage quotation: 未翻訳', timeBasis: 'Provider duration wording' };
  for (const locale of LOCALES) {
    const html = render([priced], 100, false, locale);
    for (const key of ['learn.why', 'learn.open', 'learn.coverage', 'learn.limits', 'detail.sourceLanguage', 'learn.contribution'] as const) {
      assert.ok(html.includes(escape(translate(locale, key))), `${locale}.${key} rendered`);
    }
    for (const original of [priced.title, priced.provider, priced.coverage, priced.timeBasis, 'Critical Thinking', priced.sourceUrl!]) {
      assert.ok(html.includes(escape(original)), `${locale}: original evidence ${original}`);
    }
    assert.ok(html.includes('href="https://example.invalid/course"'), `${locale}: course destination unchanged`);
    assert.match(html, /data-testid="checkbox-done-test-gap"/);
    assert.doesNotMatch(html, /\{(?:title|skill|scenario|hours|weeks|date|n)\}/);

    for (const [catalog, budget, message] of [
      [[], 100, 'learn.noResource'],
      [[resource], 100, 'learn.priceUnknown'],
      [[priced], 0, 'learn.budget'],
    ] as const) {
      assert.ok(render([...catalog], budget, false, locale).includes(escape(translate(locale, message))), `${locale}.${message}`);
    }
    const note = interpolate(translate(locale, 'learn.priceNote'), { title: resource.title });
    assert.ok(render([resource], 100, false, locale).includes(escape(note)), `${locale}: title interpolation`);
  }
});
