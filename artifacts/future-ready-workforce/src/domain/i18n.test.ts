import { it } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, LOCALE_STORAGE_KEY, isLocale, readStoredLocale, writeStoredLocale, matchBrowserLocale, interpolate } from '../i18n/locales';
import { catalogs, en, translate } from '../i18n/messages';
import { detailCatalogs, enDetail } from '../i18n/messages-detail';

const memory = (init: Record<string, string> = {}) => {
  const data = { ...init };
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; } };
};
const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

it('supports exactly the eight approved locales', () => {
  assert.deepEqual([...LOCALES], ['en', 'ms', 'zh-CN', 'zh-TW', 'ko', 'ta', 'ja', 'id']);
  assert.ok(isLocale('zh-TW'));
  for (const bad of ['', 'zh', 'EN', 'fr', null, 3, '{"en":1}']) assert.equal(isLocale(bad), false);
});

it('reads valid, missing, corrupt and blocked storage honestly', () => {
  assert.deepEqual(readStoredLocale(memory({ [LOCALE_STORAGE_KEY]: 'ja' })), { locale: 'ja', available: true });
  assert.deepEqual(readStoredLocale(memory()), { locale: null, available: true });
  assert.deepEqual(readStoredLocale(memory({ [LOCALE_STORAGE_KEY]: 'garbage' })), { locale: null, available: true });
  assert.deepEqual(readStoredLocale(blocked), { locale: null, available: false });
  assert.deepEqual(readStoredLocale(null), { locale: null, available: false });
});

it('writes only the locale code under its own key', () => {
  const s = memory({ other: 'x' });
  assert.equal(writeStoredLocale(s, 'ta'), true);
  assert.deepEqual(s.data, { other: 'x', [LOCALE_STORAGE_KEY]: 'ta' });
  assert.equal(writeStoredLocale(blocked, 'ta'), false);
});

it('matches browser languages including Traditional Chinese variants', () => {
  assert.equal(matchBrowserLocale(['zh-HK']), 'zh-TW');
  assert.equal(matchBrowserLocale(['zh-Hant-TW']), 'zh-TW');
  assert.equal(matchBrowserLocale(['zh']), 'zh-CN');
  assert.equal(matchBrowserLocale(['fr-FR', 'ko-KR']), 'ko');
  assert.equal(matchBrowserLocale(['fr']), 'en');
  assert.equal(matchBrowserLocale(undefined), 'en');
});

it('interpolates placeholders and keeps unknown ones visible', () => {
  assert.equal(interpolate('Page {current} of {pages}', { current: 2, pages: 5 }), 'Page 2 of 5');
  assert.equal(interpolate('Hi {x}', {}), 'Hi {x}');
});

it('has complete, equal-key, non-empty, meaningfully translated catalogs', () => {
  const keys = Object.keys(en).sort();
  for (const l of LOCALES) {
    const c = catalogs[l];
    assert.deepEqual(Object.keys(c).sort(), keys, `${l} keys`);
    for (const k of keys) assert.ok((c as Record<string, string>)[k].trim(), `${l}.${k} empty`);
    for (const k of keys) {
      const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      assert.deepEqual(placeholders((c as Record<string, string>)[k]), placeholders((en as Record<string, string>)[k]), `${l}.${k} placeholders`);
    }
    if (l !== 'en') {
      const same = keys.filter(k => (c as Record<string, string>)[k] === (en as Record<string, string>)[k]);
      assert.ok(same.length < keys.length * 0.05, `${l} has ${same.length} untranslated: ${same.join(', ')}`);
    }
  }
  assert.equal(translate('ko', 'lang.continue'), '계속');
});

it('bundles every secondary detail and learning key in all eight languages without fallback', () => {
  const keys = Object.keys(enDetail) as (keyof typeof enDetail)[];
  for (const locale of LOCALES) {
    assert.deepEqual(Object.keys(detailCatalogs[locale]).sort(), [...keys].sort(), `${locale} secondary keys`);
    for (const key of keys) {
      assert.ok(detailCatalogs[locale][key].trim(), `${locale}.${key}`);
      assert.equal(translate(locale, key), detailCatalogs[locale][key], `${locale}.${key} merged`);
    }
  }
});

it('interpolates every secondary placeholder in every language without translating supplied content', () => {
  const original = 'O*NET Critical Thinking / MASCO 2020 · 日本語 · <CV>{name}';
  for (const locale of LOCALES) {
    for (const [key, template] of Object.entries(detailCatalogs[locale])) {
      const placeholders = [...new Set(template.match(/\{\w+\}/g) ?? [])];
      const values = Object.fromEntries(placeholders.map(token => [token.slice(1, -1), original]));
      const rendered = interpolate(template, values);
      assert.equal(rendered, template.replace(/\{\w+\}/g, () => original), `${locale}.${key}`);
      if (placeholders.length) assert.ok(rendered.includes(original), `${locale}.${key} preserved source`);
    }
  }
});
