import { z } from 'zod';
import { loadTrendSnapshot, saveTrendSnapshot } from './trendSnapshotStore';
import type { CapabilityFact } from '@workspace/workforce-evidence';
const SOURCE = 'https://openai.com/news/rss.xml';
const factSchema = z.object({
  title: z.string().min(3).max(400), summary: z.string().max(2000),
  url: z.string().url().refine(s => new URL(s).origin === 'https://openai.com'),
  publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), capability: z.enum(['coding', 'reasoning', 'safety']),
});
const feedSchema = z.object({ items: z.array(factSchema).max(24), retrievedAt: z.string().nullable(), isStale: z.boolean(), warning: z.string().nullable(), changeSummary: z.string(), sourceUrl: z.literal(SOURCE) });
const text = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
export function parseCapabilityRss(xml: string, now = new Date()): CapabilityFact[] {
  if (xml.length > 4_000_000 || !xml.includes('<rss')) throw new Error('Unrecognised or oversized public RSS.');
  const items: CapabilityFact[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const get = (tag: string) => text(m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? '');
    const title = get('title'), summary = get('description'), url = get('link'), date = new Date(get('pubDate'));
    if (Number.isNaN(date.getTime()) || date > now || now.getTime() - date.getTime() > 180 * 86400000) continue;
    // Reviewable title-level categorisation, not benchmark extraction or a performance claim.
    const capability = /codex|coding|code agent/i.test(title) ? 'coding' : /reasoning/i.test(title) ? 'reasoning' : /safety|security/i.test(title) ? 'safety' : null;
    if (!capability) continue;
    const parsed = factSchema.safeParse({ title, summary, url, publishedOn: date.toISOString().slice(0, 10), capability });
    if (parsed.success && !items.some(i => i.url === url)) items.push(parsed.data);
    if (items.length === 24) break;
  }
  if (!items.length) throw new Error('No recent mappable source facts; no capability is inferred.');
  return items;
}
export function createCapabilityFeed(options: { fetchImpl?: typeof fetch; persist?: boolean; now?: () => Date } = {}) {
  let cache: z.infer<typeof feedSchema> = { items: [], retrievedAt: null, isStale: true, warning: 'No validated capability snapshot available. Unmapped skills remain unknown.', changeSummary: 'No source comparison available.', sourceUrl: SOURCE };
  let hydrated = false, lastAttempt = 0;
  let running: Promise<typeof cache> | null = null;
  const now = options.now ?? (() => new Date());
  async function get(force = false) {
    if (!hydrated) {
      hydrated = true;
      if (options.persist) try { const saved = feedSchema.safeParse(await loadTrendSnapshot('ai-capability-feed')); if (saved.success) cache = saved.data; } catch { cache.warning = 'Durable cache unavailable; source refresh will be attempted.'; }
    }
    const age = cache.retrievedAt ? now().getTime() - Date.parse(cache.retrievedAt) : Infinity;
    if (!force && age < 6 * 3600000) return cache;
    if (running) return running;
    if (now().getTime() - lastAttempt < 60000) return cache;
    lastAttempt = now().getTime();
    running = (async () => {
      try {
        const response = await (options.fetchImpl ?? fetch)(SOURCE, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/rss+xml' } });
        if (!response.ok) throw new Error('Public feed unavailable.');
        const items = parseCapabilityRss(await response.text(), now());
        const added = items.filter(i => !cache.items.some(old => old.url === i.url));
        const removed = cache.items.filter(i => !items.some(n => n.url === i.url));
        const next = feedSchema.parse({ items, retrievedAt: now().toISOString(), isStale: false, warning: null,
          changeSummary: `${added.length} added, ${removed.length} no longer in the recent window. Added: ${added.map(i => i.title).join('; ') || 'none'}. Removed: ${removed.map(i => i.title).join('; ') || 'none'}. Presence-based mapping: repeated announcements do not multiply weights.`, sourceUrl: SOURCE });
        if (options.persist) await saveTrendSnapshot('ai-capability-feed', next);
        cache = next;
      } catch {
        cache = { ...cache, isStale: true, warning: 'Refresh or durable save failed. Last validated snapshot retained; empty evidence means unknown, not a synthetic substitute.' };
      }
      return cache;
    })().finally(() => { running = null; });
    return running;
  }
  return { get };
}
export const aiCapabilityFeed = createCapabilityFeed({ persist: true });
