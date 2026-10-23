import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCapabilityRss, createCapabilityFeed } from './aiCapabilityFeed';
const item = (title: string, url = 'https://openai.com/index/fixture') => `<item><title><![CDATA[${title}]]></title><description>Fictional public-source parser fixture, not a real release.</description><link>${url}</link><pubDate>Thu, 22 Oct 2026 00:00:00 GMT</pubDate></item>`;
test('dated same-origin AI facts map by explicit rules; unsupported facts and hostile URLs never become evidence', () => {
  const xml = `<rss>${item('Fictional Codex coding assistance')}${item('Fictional reasoning update', 'https://openai.com/index/reasoning-fixture')}${item('Fictional security tool', 'https://evil.invalid/')}${item('Unmapped partnership announcement')}</rss>`;
  const facts = parseCapabilityRss(xml, new Date('2026-10-23'));
  assert.deepEqual(facts.map(f => f.capability), ['coding', 'reasoning']);
  assert.ok(facts.every(f => f.publishedOn === '2026-10-22'));
  assert.throws(() => parseCapabilityRss('<rss></rss>'));
});
test('capability feed coalesces/limits retrieval and fails honestly without fabricated fallback', async () => {
  let calls = 0;
  const service = createCapabilityFeed({ now: () => new Date('2026-10-23'), fetchImpl: (async () => { calls++; return new Response('Unavailable', { status: 503 }); }) as typeof fetch });
  const result = await service.get();
  assert.equal(result.isStale, true); assert.equal(result.items.length, 0); assert.match(result.warning!, /Last validated snapshot retained/);
  await service.get(true); assert.equal(calls, 1);
});
