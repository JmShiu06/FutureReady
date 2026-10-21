import { z } from "zod";

const LISTING_URL = "https://www.digital.gov.my/en-GB/siaran";
const SITE_ORIGIN = "https://www.digital.gov.my";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2_000_000;
const STALE_AFTER_DAYS = 14;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Only titles that explicitly mention AI are kept; nothing is inferred or scored.
const AI_TITLE = /\bAI\b|artificial intelligence|kecerdasan buatan/i;

const itemSchema = z.object({
  title: z.string().min(3).max(300),
  publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().max(80).nullable(),
  url: z.string().url().startsWith(`${SITE_ORIGIN}/`),
});

export type AiAnnouncement = z.infer<typeof itemSchema> & { source: string };

type CacheEntry = { items: AiAnnouncement[]; retrievedAt: string; expiresAt: number };

type ServiceOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  cacheTtlMs?: number;
  requestTimeoutMs?: number;
  listingUrl?: string;
};

const decode = (value: string) =>
  value
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

function parseDate(text: string): string | undefined {
  const match = text.trim().match(/^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/);
  if (!match) return undefined;
  const month = MONTHS.indexOf(match[2]);
  if (month < 0) return undefined;
  const iso = `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : undefined;
}

/**
 * Reads the server-rendered Ministry of Digital press-release listing.
 * Throws if the page structure no longer yields any valid entry, so a layout
 * change surfaces as a failed refresh instead of silently empty data.
 */
export function parseMinistryListing(html: string): { all: number; items: AiAnnouncement[] } {
  const blocks = html.split(/<a\s[^>]*?href="(\/en-GB\/siaran\/[^"]+)"[^>]*>/).slice(1);
  const seen = new Set<string>();
  let all = 0;
  const items: AiAnnouncement[] = [];
  for (let index = 0; index + 1 < blocks.length; index += 2) {
    const href = decode(blocks[index]);
    const body = blocks[index + 1].split("</a>")[0];
    const title = body.match(/<p class="[^"]*font-semibold -tracking[^"]*">([^<]+)<\/p>/)?.[1];
    const time = body.match(/<time[^>]*>([^<]+)<\/time>/)?.[1];
    const category = body.match(/<p class="font-semibold text-foreground-warning">([^<]+)<\/p>/)?.[1];
    const publishedOn = time ? parseDate(decode(time)) : undefined;
    if (!title || !publishedOn) continue;
    const parsed = itemSchema.safeParse({
      title: decode(title),
      publishedOn,
      category: category ? decode(category) : null,
      url: `${SITE_ORIGIN}${encodeURI(href)}`,
    });
    if (!parsed.success || seen.has(parsed.data.url)) continue;
    seen.add(parsed.data.url);
    all++;
    if (AI_TITLE.test(parsed.data.title)) {
      items.push({ ...parsed.data, source: "Ministry of Digital Malaysia" });
    }
  }
  if (all === 0) throw new Error("The Ministry of Digital listing format was not recognised.");
  items.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
  return { all, items };
}

function toResponse(cache: CacheEntry, now: Date, fallbackUsed: boolean) {
  const newest = cache.items[0]?.publishedOn;
  const ageDays = newest
    ? (now.getTime() - new Date(`${newest}T00:00:00.000Z`).getTime()) / 86_400_000
    : null;
  const tooOld = ageDays !== null && ageDays > STALE_AFTER_DAYS;
  const warning = fallbackUsed
    ? "The latest refresh failed. Showing the previously retrieved announcements."
    : tooOld
      ? `The newest listed AI announcement is more than ${STALE_AFTER_DAYS} days old.`
      : null;
  return {
    items: cache.items,
    source: { name: "Ministry of Digital Malaysia — press releases", listingUrl: LISTING_URL },
    retrievedAt: cache.retrievedAt,
    isStale: fallbackUsed || tooOld,
    warning,
    limitations: [
      "Entries are retrieved by reading the public listing page because the Ministry offers no RSS feed or API; a site redesign can interrupt retrieval.",
      "Only titles that explicitly mention AI are listed. Announcements are qualitative context, not skill-demand measurements or forecasts.",
      "MDEC press releases are not included: MDEC offers no feed and blocks automated API requests.",
    ],
  };
}

export function createAiAnnouncementService(options: ServiceOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_MS;
  const requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const listingUrl = options.listingUrl ?? LISTING_URL;
  let cache: CacheEntry | null = null;

  async function download(): Promise<CacheEntry> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchImpl(listingUrl, {
        headers: { accept: "text/html", "user-agent": "FutureReadyWorkforce/1.0 (public announcement reader)" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Ministry of Digital responded with HTTP ${response.status}.`);
      const html = await response.text();
      if (html.length > MAX_HTML_BYTES) throw new Error("The Ministry of Digital page was unexpectedly large.");
      const retrieved = now();
      return { items: parseMinistryListing(html).items, retrievedAt: retrieved.toISOString(), expiresAt: retrieved.getTime() + cacheTtlMs };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function get() {
    const current = now();
    if (cache && current.getTime() < cache.expiresAt) return toResponse(cache, current, false);
    try {
      cache = await download();
      return toResponse(cache, now(), false);
    } catch (error) {
      if (!cache) throw error;
      return toResponse(cache, now(), true);
    }
  }

  async function refresh() {
    cache = await download();
    return toResponse(cache, now(), false);
  }

  return { get, refresh };
}

export const aiAnnouncementService = createAiAnnouncementService();
