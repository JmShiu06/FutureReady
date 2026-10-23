import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDosmJobMarketService, parseDosmWorkbook } from './dosmJobMarket';

test('public-source refresh failure retains the reviewed snapshot without synthetic substitution', async () => {
  let calls = 0;
  const service = createDosmJobMarketService({
    now: () => new Date('2026-10-23T00:00:00Z'),
    fetchImpl: (async () => { calls++; return new Response('Unavailable', { status: 503 }); }) as typeof fetch,
  });
  const before = service.get();
  await assert.rejects(service.refresh());
  assert.deepEqual(service.get().occupationGroups, before.occupationGroups);
  assert.equal(service.get().isStale, true);
  assert.match(service.get().warning!, /Last validated snapshot retained/);
  await assert.rejects(service.refresh(), /one minute/);
  assert.equal(calls, 1);
});
test('invalid workbook fails explicitly rather than manufacturing observations', async () => {
  await assert.rejects(parseDosmWorkbook(Buffer.from('fictional invalid ZIP'), 'https://www.dosm.gov.my/', 'https://www.dosm.gov.my/', '2026-08-18'));
});
