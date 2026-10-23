import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createArxivSignals, parseTotalResults, researchWindows } from './arxivSignals';
test('arXiv counts parse strictly and windows are contiguous', () => {
  assert.equal(parseTotalResults('<opensearch:totalResults>0</opensearch:totalResults>'), 0);
  assert.throws(() => parseTotalResults('<error>busy</error>'));
  const w = researchWindows(new Date('2026-10-23T10:00:00Z'));
  assert.equal(w.current.toISOString().slice(0, 10), '2026-04-23');
  assert.equal(w.previous.toISOString().slice(0, 10), '2025-10-23');
});
test('ten sequential requests respect the delay; failure retains only last successful cache', async () => {
  const dir = await mkdtemp(`${tmpdir()}/arxiv-test-`);
  try {
    const delays: number[] = []; let calls = 0; let failing = false; let time = Date.parse('2026-10-23T10:00:00Z');
    const service = createArxivSignals({
      cachePath: `${dir}/cache.json`, now: () => new Date(time),
      delay: async ms => { delays.push(ms); },
      fetchImpl: (async () => { calls++; if (failing) return new Response('', { status: 503 }); return new Response('<opensearch:totalResults>42</opensearch:totalResults>'); }) as typeof fetch,
    });
    await service.refresh();
    for (let i = 0; i < 100 && (await service.get()).refreshing; i++) await new Promise(r => setTimeout(r, 5));
    const first = await service.get();
    assert.equal(calls, 10); assert.equal(delays.length, 9); assert.ok(delays.every(ms => ms >= 3000));
    assert.equal(first.snapshot?.counts.length, 5);
    time += 61000; failing = true; await service.refresh();
    for (let i = 0; i < 100 && (await service.get()).refreshing; i++) await new Promise(r => setTimeout(r, 5));
    const failed = await service.get();
    assert.equal(failed.snapshot?.fetchedAt, first.snapshot?.fetchedAt); assert.ok(failed.error);
    const restored = await createArxivSignals({ cachePath: `${dir}/cache.json` }).get();
    assert.equal(restored.snapshot?.fetchedAt, first.snapshot?.fetchedAt);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
