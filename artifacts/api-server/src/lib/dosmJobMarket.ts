import yauzl from "yauzl";
import { validateDosmJobMarketInsightsSnapshot } from "../data/dosm-jmi-2026";
import { loadTrendSnapshot, saveTrendSnapshot } from './trendSnapshotStore';
import { GetDosmJobMarketInsightsResponse } from '@workspace/api-zod';
type Observation = { quarter: string; jobOfferings: number; publicationDate: string; reportUrl: string; dataUrl: string };
type DosmJobMarketInsightsResponse = Omit<ReturnType<typeof validateDosmJobMarketInsightsSnapshot>, "occupationGroups" | "totalByQuarter" | "sourceUrl" | "methodology"> & {
  sourceUrl: string; methodology: string;
  occupationGroups: { id: string; label: string; observations: readonly Observation[] }[]; totalByQuarter: readonly Observation[];
  retrievedAt?: string | null; warning?: string | null; isStale?: boolean;
};

const ORIGIN = "https://www.dosm.gov.my";
const LIMIT = 5_000_000;
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const column = (s: string) => [...s].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);

/** Only two bounded XML entries are read; no ZIP content is extracted to disk. */
async function workbookXml(buffer: Buffer): Promise<Record<string, string>> {
  if (buffer.length > LIMIT) throw new Error("Workbook exceeds size limit.");
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new Error("Invalid workbook ZIP."));
      const result: Record<string, string> = {};
      zip.on("error", reject);
      zip.on("end", () => resolve(result));
      zip.on("entry", entry => {
        if (!["xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"].includes(entry.fileName)) return zip.readEntry();
        if (entry.uncompressedSize > LIMIT) { zip.close(); return reject(new Error("Workbook expansion exceeds limit.")); }
        zip.openReadStream(entry, (err, stream) => {
          if (err || !stream) { zip.close(); return reject(new Error("Unreadable workbook entry.")); }
          const chunks: Buffer[] = []; let size = 0;
          stream.on("error", reject);
          stream.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > LIMIT) { stream.destroy(); zip.close(); reject(new Error("Workbook expansion exceeds limit.")); }
            else chunks.push(chunk);
          });
          stream.on("end", () => { result[entry.fileName] = Buffer.concat(chunks).toString("utf8"); zip.readEntry(); });
        });
      });
      zip.readEntry();
    });
  });
}

export async function parseDosmWorkbook(buffer: Buffer, reportUrl: string, dataUrl: string, publicationDate: string): Promise<DosmJobMarketInsightsResponse> {
  const xml = await workbookXml(buffer);
  const strings = [...(xml["xl/sharedStrings.xml"] ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(m => [...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(t => decode(t[1])).join(""));
  const rows = [...(xml["xl/worksheets/sheet1.xml"] ?? "").matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(row => {
    const cells = new Map<number, string>();
    for (const m of row[1].matchAll(/<c\b([^>]*)(?<!\/)>([\s\S]*?)<\/c>/g)) {
      const ref = m[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      const value = m[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (ref && value !== undefined) cells.set(column(ref), /\bt="s"/.test(m[1]) ? strings[Number(value)] ?? "" : decode(value));
    }
    return cells;
  });
  const table = rows.findIndex(r => [...r.values()].some(v => /^Table 2:.*Major Group Occupation/i.test(v)));
  if (table < 0) throw new Error("DOSM Table 2 not recognised.");
  const header = rows.findIndex((r, i) => i > table && [...r.values()].includes("Occupation"));
  if (header < 1) throw new Error("Quarter headers unavailable.");
  const years = rows[header - 1];
  const periods: { col: number; quarter: string }[] = [];
  let year = "";
  for (let c = 1; c <= Math.max(...rows[header].keys()); c++) {
    if (/^\d{4}$/.test(years.get(c) ?? "")) year = years.get(c)!;
    const q = rows[header].get(c) ?? "";
    if (/^Q[1-4]$/.test(q) && year) periods.push({ col: c, quarter: `${year}-${q}` });
  }
  const seed = validateDosmJobMarketInsightsSnapshot();
  const selectedRows = seed.occupationGroups.map(g => {
    const row = rows.slice(header + 1).find(r => r.get(2)?.toLowerCase() === g.label.toLowerCase());
    if (!row) throw new Error("Occupation labels changed; manual source review required.");
    return { group: g, row };
  });
  const numeric = (value?: string) => value !== undefined && /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
  const available = periods.filter(p => selectedRows.every(r => numeric(r.row.get(p.col)))).slice(-2);
  if (available.length !== 2) throw new Error("Two comparable complete quarters are required.");
  const totalRow = rows.slice(header + 1).find(r => r.get(2) === "Jumlah");
  for (const p of available) {
    const sum = selectedRows.reduce((n, r) => n + Number(r.row.get(p.col)), 0);
    if (!numeric(totalRow?.get(p.col)) || sum !== Number(totalRow!.get(p.col))) throw new Error("Occupation totals do not reconcile; prior snapshot retained.");
  }
  const observation = (p: typeof available[number], n: number) => ({ quarter: p.quarter, jobOfferings: n, publicationDate, reportUrl, dataUrl });
  return {
    ...seed, sourceUrl: reportUrl,
    methodology: "Latest available DOSM JMI workbook, Table 2. Publication dates refer to the retrieved workbook, including its retrospective observations. Runtime schema/totals validation is not a new human review.",
    totalByQuarter: available.map(p => observation(p, Number(totalRow!.get(p.col)))),
    occupationGroups: selectedRows.map(({ group, row }) => ({ id: group.id, label: group.label, observations: available.map(p => observation(p, Number(row.get(p.col)))) })),
  };
}

export function createDosmJobMarketService(options: { fetchImpl?: typeof fetch; now?: () => Date; persist?: boolean } = {}) {
  const fetcher = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  let cached: DosmJobMarketInsightsResponse = { ...validateDosmJobMarketInsightsSnapshot(), retrievedAt: null, isStale: true, warning: "Bundled reviewed snapshot. Refresh to retrieve the current official workbook." };
  let running: Promise<DosmJobMarketInsightsResponse> | undefined;
  let lastAttempt = 0;
  let hydrated = false;
  async function hydrate() {
    if (hydrated || !options.persist) return;
    hydrated = true;
    try {
      const saved = await loadTrendSnapshot('dosm-jmi');
      if (saved && GetDosmJobMarketInsightsResponse.safeParse(saved).success) {
        const candidate = saved as DosmJobMarketInsightsResponse;
        const validUrls = candidate.totalByQuarter.every(q => [q.reportUrl, q.dataUrl].every(u => new URL(u).origin === ORIGIN));
        if (validUrls) cached = { ...candidate, isStale: !candidate.retrievedAt || Date.now() - Date.parse(candidate.retrievedAt) > 6 * 3600000 };
      }
    } catch { cached = { ...cached, warning: 'Durable snapshot unavailable. Bundled reviewed snapshot retained.', isStale: true }; }
  }
  async function download() {
    const time = now(); lastAttempt = time.getTime();
    try {
      for (let offset = 0; offset < 6; offset++) {
        const quarterIndex = time.getUTCFullYear() * 4 + Math.floor(time.getUTCMonth() / 3) - offset;
        const reportUrl = `${ORIGIN}/portal-main/release-content/big-data-analytics-job-market-insights-q${quarterIndex % 4 + 1}${Math.floor(quarterIndex / 4)}`;
        const page = await fetcher(reportUrl, { signal: AbortSignal.timeout(8000) });
        if (page.status === 404) continue;
        if (!page.ok) throw new Error("Official release unavailable.");
        const html = await page.text();
        if (html.length > LIMIT) throw new Error("Release page too large.");
        const date = html.match(/Latest Release\s*:\s*(\d{1,2} [A-Za-z]+ \d{4})/)?.[1];
        const published = date ? new Date(date + " UTC") : null;
        if (!published || Number.isNaN(published.getTime())) continue;
        const links = [...new Set([...html.matchAll(/href="([^"]*release-document-log\?[^"]+)"/g)].map(m => decode(m[1])))].filter(u => !u.includes("type=pdf"));
        for (const link of links) {
          const dataUrl = new URL(link, ORIGIN).href;
          if (new URL(dataUrl).origin !== ORIGIN) continue;
          const response = await fetcher(dataUrl, { signal: AbortSignal.timeout(10000) });
          if (!response.ok || !response.headers.get("content-type")?.includes("spreadsheetml")) continue;
          if (Number(response.headers.get("content-length")) > LIMIT) throw new Error("Workbook too large.");
          const buffer = Buffer.from(await response.arrayBuffer());
          const next = await parseDosmWorkbook(buffer, reportUrl, dataUrl, published.toISOString().slice(0, 10));
          const validated = { ...next, retrievedAt: time.toISOString(), isStale: false, warning: null };
          if (options.persist) await saveTrendSnapshot('dosm-jmi', validated);
          cached = validated;
          return cached;
        }
      }
      throw new Error("A supported current DOSM workbook was not found.");
    } catch (error) {
      cached = { ...cached, isStale: true, warning: "Refresh failed. Last validated snapshot retained; no new observations were invented." };
      throw error;
    }
  }
  return {
    get: () => cached,
    getLatest: async () => {
      await hydrate();
      if (cached.retrievedAt && now().getTime() - Date.parse(cached.retrievedAt) < 6 * 3600000) return cached;
      if (!running && now().getTime() - lastAttempt >= 60000) {
        running = download().finally(() => { running = undefined; });
        try { await running; } catch { /* Explicit fallback warning is set by download. */ }
      }
      return cached;
    },
    refresh: () => {
      if (running) return running;
      if (now().getTime() - lastAttempt < 60_000) return Promise.reject(new Error("Wait one minute before refreshing again."));
      running = download().finally(() => { running = undefined; });
      return running;
    },
  };
}
export const dosmJobMarketService = createDosmJobMarketService({ persist: true });
