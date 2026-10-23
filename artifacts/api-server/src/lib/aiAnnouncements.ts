import { z } from "zod";

export const LISTING_URL = "https://www.digital.gov.my/en-GB/siaran";
const SITE_ORIGIN = "https://www.digital.gov.my";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_ERROR_BODY_BYTES = 4_096;
const MAX_LOG_EXCERPT_CHARS = 300;
const STALE_AFTER_DAYS = 14;
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LOGGABLE_RESPONSE_HEADERS = [
  "retry-after",
  "content-type",
  "content-length",
  "date",
  "server",
  "via",
  "cache-control",
  "age",
  "x-request-id",
  "cf-ray",
  "x-cache",
] as const;

export type AiAnnouncementFetchDiagnostics = {
  requestUrl: string;
  responseStatus: number | null;
  responseHeaders: Record<string, string>;
  contentType: string | null;
  sanitizedExcerpt: string | null;
  failureKind: "http_status" | "timeout" | "network" | "response_processing";
};

export class AiAnnouncementSourceUnavailableError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds = DEFAULT_RETRY_AFTER_SECONDS,
    readonly sourceStatus?: number,
    readonly diagnostics?: AiAnnouncementFetchDiagnostics,
  ) {
    super(message);
    this.name = "AiAnnouncementSourceUnavailableError";
  }
}

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

function retryAfterSeconds(value: string | null, now: Date): number {
  if (!value) return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = /^\d+$/.test(value.trim())
    ? Number(value)
    : Math.ceil((Date.parse(value) - now.getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_RETRY_AFTER_SECONDS;
  return Math.min(86_400, seconds);
}

function safeExcerpt(text: string): string {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/&(?:lt|#60);/gi, "<")
    .replace(/&(?:gt|#62);/gi, ">")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:token|api[_ -]?key|authorization|cookie)\s*[:=]\s*["']?[^"' \t,;]+/gi, "credential=[REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b(?:\+?\d[\d ().-]{7,}\d)\b/g, "[PHONE]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LOG_EXCERPT_CHARS);
}

function responseDiagnostics(
  requestUrl: string,
  responseStatus: number | null,
  headers: Headers | null,
  sanitizedExcerpt: string | null,
  failureKind: AiAnnouncementFetchDiagnostics["failureKind"],
): AiAnnouncementFetchDiagnostics {
  const responseHeaders: Record<string, string> = {};
  for (const name of LOGGABLE_RESPONSE_HEADERS) {
    const value = headers?.get(name);
    if (value) responseHeaders[name] = value.slice(0, 300);
  }
  return {
    requestUrl,
    responseStatus,
    responseHeaders,
    contentType: headers?.get("content-type")?.slice(0, 200) ?? null,
    sanitizedExcerpt,
    failureKind,
  };
}

async function readErrorExcerpt(response: Response): Promise<string | null> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/") && !contentType.includes("json") && !contentType.includes("xml")) return null;
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  try {
    while (result.length < MAX_ERROR_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true }).slice(0, MAX_ERROR_BODY_BYTES - result.length);
    }
    result += decoder.decode();
    return safeExcerpt(result);
  } finally {
    void reader.cancel().catch(() => undefined);
  }
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

function toResponse(
  cache: CacheEntry,
  now: Date,
  fallbackUsed: boolean,
  sourceFailure?: AiAnnouncementFetchDiagnostics,
) {
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
    ...(sourceFailure ? { sourceFailure } : {}),
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
  let retryAt = 0;
  let lastFailure: AiAnnouncementSourceUnavailableError | null = null;

  async function download(): Promise<CacheEntry> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchImpl(listingUrl, {
        headers: { accept: "text/html", "user-agent": "FutureReadyWorkforce/1.0 (public announcement reader)" },
        signal: controller.signal,
      });
      if (!response.ok) {
        const excerpt = await readErrorExcerpt(response);
        const diagnostics = responseDiagnostics(listingUrl, response.status, response.headers, excerpt, "http_status");
        throw new AiAnnouncementSourceUnavailableError(
          `The Ministry of Digital listing returned HTTP ${response.status}.`,
          retryAfterSeconds(response.headers.get("retry-after"), now()),
          response.status,
          diagnostics,
        );
      }
      const html = await response.text();
      if (html.length > MAX_HTML_BYTES) throw new Error("The Ministry of Digital page was unexpectedly large.");
      const retrieved = now();
      try {
        return { items: parseMinistryListing(html).items, retrievedAt: retrieved.toISOString(), expiresAt: retrieved.getTime() + cacheTtlMs };
      } catch (error) {
        const diagnostics = responseDiagnostics(
          listingUrl,
          response.status,
          response.headers,
          safeExcerpt(error instanceof Error ? error.message : "Response could not be processed."),
          "response_processing",
        );
        throw new AiAnnouncementSourceUnavailableError(
          "The Ministry of Digital page response could not be processed.",
          DEFAULT_RETRY_AFTER_SECONDS,
          response.status,
          diagnostics,
        );
      }
    } catch (error) {
      if (error instanceof AiAnnouncementSourceUnavailableError) throw error;
      const timedOut = controller.signal.aborted;
      const failureKind = timedOut ? "timeout" : "network";
      throw new AiAnnouncementSourceUnavailableError(
        timedOut ? "The Ministry of Digital listing request timed out." : "The official announcement listing could not be reached.",
        DEFAULT_RETRY_AFTER_SECONDS,
        undefined,
        responseDiagnostics(listingUrl, null, null, safeExcerpt(error instanceof Error ? error.message : "Request failed."), failureKind),
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchAndCache() {
    if (retryAt > now().getTime() && lastFailure) throw lastFailure;
    try {
      cache = await download();
      retryAt = 0;
      lastFailure = null;
      return cache;
    } catch (error) {
      const failure = error instanceof AiAnnouncementSourceUnavailableError
        ? error
        : new AiAnnouncementSourceUnavailableError("The official announcement listing could not be reached.");
      lastFailure = failure;
      retryAt = now().getTime() + failure.retryAfterSeconds * 1000;
      throw failure;
    }
  }

  async function get() {
    const current = now();
    if (cache && current.getTime() < cache.expiresAt) return toResponse(cache, current, false);
    try {
      if (retryAt > current.getTime() && lastFailure) {
        if (!cache) throw lastFailure;
        return toResponse(cache, current, true, lastFailure.diagnostics);
      }
       return toResponse(await fetchAndCache(), now(), false);
    } catch (error) {
      if (!cache) throw error;
       return toResponse(cache, now(), true, error instanceof AiAnnouncementSourceUnavailableError ? error.diagnostics : undefined);
    }
  }

  async function refresh() {
    return toResponse(await fetchAndCache(), now(), false);
  }

  return { get, refresh };
}

export const aiAnnouncementService = createAiAnnouncementService();
