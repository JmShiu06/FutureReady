import { readFile, writeFile, rename } from 'node:fs/promises';
import { aiCapabilities, researchWeights, type ResearchSnapshot, type ResearchCount } from '@workspace/workforce-evidence';
const CACHE = '/tmp/futureready-arxiv-signals.json';
export function parseTotalResults(xml: string) {
  const value = xml.match(/<(?:opensearch:)?totalResults\b[^>]*>\s*(\d+)\s*<\/(?:opensearch:)?totalResults>/)?.[1];
  if (!value || !Number.isSafeInteger(Number(value))) throw new Error('arXiv did not return a valid totalResults count.');
  return Number(value);
}
export function researchWindows(now: Date) {
  const end = new Date(now); end.setUTCHours(0, 0, 0, 0);
  const current = new Date(end); current.setUTCMonth(current.getUTCMonth() - 6);
  const previous = new Date(end); previous.setUTCMonth(previous.getUTCMonth() - 12);
  return { end, current, previous };
}
const stamp = (d: Date) => `${d.toISOString().slice(0, 10).replaceAll('-', '')}0000`;
export function createArxivSignals(options: { fetchImpl?: typeof fetch; now?: () => Date; delay?: (ms: number) => Promise<void>; cachePath?: string } = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const delay = options.delay ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const path = options.cachePath ?? CACHE;
  let snapshot: ResearchSnapshot | null = null;
  let refreshing = false, error: string | null = null, lastAttempt = 0;
  let hasRequested = false;
  let ready: Promise<void> | undefined;
  const load = () => ready ??= readFile(path, 'utf8').then(raw => {
    const data = JSON.parse(raw);
    // Do not accept partial, corrupt or synthetic cache entries.
    if (data.source !== 'arXiv API' || !Number.isFinite(Date.parse(data.fetchedAt))
      || data.counts?.length !== aiCapabilities.length
      || !aiCapabilities.every(a => data.counts.some((c: ResearchCount) => c.capability === a.id && Number.isSafeInteger(c.current) && c.current >= 0 && Number.isSafeInteger(c.previous) && c.previous >= 0))) return;
    snapshot = { ...data, weights: researchWeights(data.counts) };
  }).catch(() => {});
  async function collect() {
    const { end, current, previous } = researchWindows(now());
    const counts: ResearchCount[] = [];
    const count = async (query: string, start: Date, until: Date) => {
      if (hasRequested) await delay(3100); // Sequential, including the first request of subsequent refreshes.
      hasRequested = true;
      const lastMinute = new Date(until.getTime() - 60000);
      const url = new URL('https://export.arxiv.org/api/query');
      url.searchParams.set('search_query', `(${query}) AND submittedDate:[${stamp(start)} TO ${stamp(lastMinute).slice(0, 8)}2359]`);
      url.searchParams.set('start', '0'); url.searchParams.set('max_results', '1');
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'FutureReadyWorkforce/1.0 (research-activity demo)' } });
      if (!response.ok) throw new Error(`arXiv HTTP ${response.status}`);
      return { n: parseTotalResults(await response.text()), url: url.href };
    };
    for (const a of aiCapabilities) {
      const latest = await count(a.query, current, end);
      const prior = await count(a.query, previous, current);
      counts.push({ capability: a.id, label: a.label, query: a.query, current: latest.n, previous: prior.n,
        currentQueryUrl: latest.url, previousQueryUrl: prior.url, growth: prior.n > 0 ? (latest.n - prior.n) / prior.n : null });
    }
    const next: ResearchSnapshot = { source: 'arXiv API', fetchedAt: now().toISOString(),
      currentStart: current.toISOString(), previousStart: previous.toISOString(), end: end.toISOString(), counts, weights: researchWeights(counts) };
    // Atomic last-successful cache. A failed refresh never replaces old observations.
    await writeFile(`${path}.next`, JSON.stringify(next));
    await rename(`${path}.next`, path);
    snapshot = next;
  }
  return {
    async get() { await load(); return { snapshot, refreshing, error }; },
    async refresh() {
      await load();
      if (!refreshing && now().getTime() - lastAttempt >= 60000) {
        lastAttempt = now().getTime(); refreshing = true; error = null;
        void collect().catch(() => { error = 'arXiv could not be refreshed. Last successful data, if any, is retained; no counts were invented.'; }).finally(() => { refreshing = false; });
      }
      return { snapshot, refreshing, error };
    },
  };
}
export const arxivSignals = createArxivSignals();
