/**
 * pnpm --filter @workspace/api-server run check:job-links [--offline]
 * Public GETs only: no scraping, credentials, CVs or model generation.
 * Exit 0: passed; exit 1: definite broken/invalid link; exit 2: blocked/unverified.
 */
import { externalJobSearchLinks } from '@workspace/workforce-evidence';
import { mycolOccupations } from '../src/data/occupation-evidence/mycol-2024-2025';
import { classifyJobPage } from '../src/services/jobLinkCheck';

const offline = process.argv.includes('--offline');
const links = new Map<string, string>();
for (const occupation of mycolOccupations) {
  for (const link of externalJobSearchLinks(occupation.title)) {
    const url = new URL(link.url);
    if (url.protocol !== 'https:') throw new Error(`Non-HTTPS job-search URL for ${link.site}`);
    if (link.site === 'LinkedIn' &&
      (url.pathname !== '/jobs/search/' || url.searchParams.get('keywords') !== occupation.title || url.searchParams.get('location') !== 'Malaysia'))
      throw new Error(`Invalid LinkedIn search URL for ${occupation.title}`);
    links.set(link.url, `${link.site} · ${link.kind}`);
  }
}
if (offline) console.log(`PASS: ${links.size} unique public URLs; all occupation titles encoded and LinkedIn location set to Malaysia. No requests made.`);
else {
  let broken = 0, unverified = 0;
  for (const [url, label] of links) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
      const body = await response.text();
      const state = classifyJobPage(label.split(' · ')[0], response.status, body);
      if (state === 'BROKEN') broken++;
      else if (state !== 'PASS') unverified++;
      console.log(`${state} HTTP ${response.status} ${label} ${url}`);
    } catch {
      unverified++;
      console.log(`UNVERIFIED NETWORK/TIMEOUT ${label} ${url}`);
    }
  }
  console.log(`${links.size} unique URLs checked; ${broken} broken; ${unverified} blocked or unverified. Secondary sites use homepages, not unverified search patterns.`);
  process.exitCode = broken ? 1 : unverified ? 2 : 0;
}
