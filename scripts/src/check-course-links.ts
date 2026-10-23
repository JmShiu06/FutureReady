/** Read-only catalogue link checker. A successful fetch alone is not a content/price review. */
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../../artifacts/future-ready-workforce/src/domain/resource-catalog.ts', import.meta.url), 'utf8');
const urls = [...new Set([...source.matchAll(/(?:url|sourceUrl):\s*'(https:\/\/[^']+)'/g)].map(m => m[1]))];
let failed = 0;
for (const url of urls) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'FutureReadyCourseLinkCheck/1.0' } });
    const html = await response.text();
    const softFailure = /<title[^>]*>\s*(?:404|405|page not found)/i.test(html) || /404 error page/i.test(html);
    const ok = response.ok && !softFailure;
    if (!ok) failed++;
    process.stdout.write(`${ok ? 'OK' : 'CHECK'} HTTP ${response.status} ${url}\n`);
  } catch {
    failed++;
    process.stdout.write(`CHECK Network/timeout failure ${url}\n`);
  }
}
process.stdout.write(`${urls.length} unique links checked; ${failed} need manual review. No catalogue fields changed.\n`);
process.exitCode = failed ? 1 : 0;
