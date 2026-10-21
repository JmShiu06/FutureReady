import { z } from "zod";

const OPEN_DOSM_API_URL = "https://api.data.gov.my/opendosm/";
const OPEN_DOSM_CATALOGUE_URL = "https://open.dosm.gov.my/data-catalogue/lfs_month";
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const STALE_AFTER_DAYS = 120;

const rawLfsRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/),
  lf: z.number().finite().nonnegative(),
  p_rate: z.number().finite().min(0).max(100),
  u_rate: z.number().finite().min(0).max(100),
  ep_ratio: z.number().finite().min(0).max(100),
  lf_outside: z.number().finite().nonnegative(),
  lf_employed: z.number().finite().nonnegative(),
  lf_unemployed: z.number().finite().nonnegative(),
});

export type LabourForceObservation = {
  date: string;
  labourForceThousands: number;
  employedThousands: number;
  unemployedThousands: number;
  outsideLabourForceThousands: number;
  participationRate: number;
  employmentPopulationRatio: number;
  unemploymentRate: number;
  publicationDate: null;
};

type CacheEntry = {
  observations: LabourForceObservation[];
  retrievedAt: string;
  expiresAt: number;
};

type ServiceOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  cacheTtlMs?: number;
  requestTimeoutMs?: number;
  apiUrl?: string;
};

export function parseOpenDosmLabourForcePayload(payload: unknown): LabourForceObservation[] {
  if (!Array.isArray(payload) || payload.length === 0 || payload.length > 500) {
    throw new Error("OpenDOSM returned an empty or oversized labour-force dataset.");
  }

  const dates = new Set<string>();
  const parsed = payload.map((rawRecord, index) => {
    const result = rawLfsRecordSchema.safeParse(rawRecord);
    if (!result.success) {
      throw new Error(`OpenDOSM record ${index + 1} failed validation.`);
    }
    const record = result.data;
    const monthDate = new Date(`${record.date}T00:00:00.000Z`);
    if (Number.isNaN(monthDate.getTime()) || monthDate.toISOString().slice(0, 10) !== record.date) {
      throw new Error(`OpenDOSM record ${index + 1} has an invalid observation date.`);
    }
    if (dates.has(record.date)) {
      throw new Error("OpenDOSM returned duplicate monthly observations.");
    }
    dates.add(record.date);

    return {
      date: record.date,
      labourForceThousands: record.lf,
      employedThousands: record.lf_employed,
      unemployedThousands: record.lf_unemployed,
      outsideLabourForceThousands: record.lf_outside,
      participationRate: record.p_rate,
      employmentPopulationRatio: record.ep_ratio,
      unemploymentRate: record.u_rate,
      publicationDate: null,
    };
  });

  return parsed.sort((a, b) => a.date.localeCompare(b.date));
}

function isMonth(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const parsed = new Date(`${value}-01T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 7) === value;
}

function toLabourForceResponse(
  cache: CacheEntry,
  options: { fallbackUsed?: boolean; fromMonth?: string; toMonth?: string; now: Date },
) {
  const observations = cache.observations.filter(observation => {
    const month = observation.date.slice(0, 7);
    return (!options.fromMonth || month >= options.fromMonth) &&
      (!options.toMonth || month <= options.toMonth);
  });
  const latestObservationDate = cache.observations.at(-1)?.date;
  if (!latestObservationDate) throw new Error("OpenDOSM cache unexpectedly contains no observations.");

  const ageMs = options.now.getTime() - new Date(`${latestObservationDate}T00:00:00.000Z`).getTime();
  const dataTooOld = ageMs > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const isStale = Boolean(options.fallbackUsed) || dataTooOld;
  const warning = options.fallbackUsed
    ? "The latest refresh failed. Showing the previously retrieved DOSM data."
    : dataTooOld
      ? `The latest available observation is more than ${STALE_AFTER_DAYS} days old.`
      : null;

  return {
    metadata: {
      datasetId: "lfs_month",
      sourceName: "Department of Statistics Malaysia — OpenDOSM",
      sourceUrl: OPEN_DOSM_CATALOGUE_URL,
      apiUrl: OPEN_DOSM_API_URL,
      license: "Creative Commons Attribution 4.0 International",
      licenseUrl: LICENSE_URL,
      attribution: "Data source: Department of Statistics Malaysia.",
      coverage: "Malaysia (national aggregate)",
      countUnit: "Thousands of people",
      rateUnit: "Percent",
      methodology:
        "Monthly principal labour-force statistics from DOSM's Labour Force Survey, retrieved from the official OpenDOSM API.",
      caveats: [
        "These national labour-force indicators are not occupation-level vacancies or skill-demand measurements.",
        "DOSM notes a population benchmark change: observations before 2025 use the 2010 Census, while 2025 onward uses the 2020 Census. Interpret comparisons across this boundary cautiously.",
        "The API provides observation months but no per-observation publication date; publicationDate is therefore null.",
      ],
      retrievedAt: cache.retrievedAt,
      latestObservationDate,
    },
    observations,
    isStale,
    warning,
  };
}

export function createDosmLabourForceService(options: ServiceOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_MS;
  const requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const apiUrl = options.apiUrl ?? OPEN_DOSM_API_URL;
  let cache: CacheEntry | null = null;

  async function download(): Promise<CacheEntry> {
    const url = new URL(apiUrl);
    url.searchParams.set("id", "lfs_month");
    url.searchParams.set("date_start", "2010-01-01@date");
    url.searchParams.set("sort", "date");
    url.searchParams.set("limit", "500");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`OpenDOSM responded with HTTP ${response.status}.`);
      }
      const observations = parseOpenDosmLabourForcePayload(await response.json());
      const retrieved = now();
      return {
        observations,
        retrievedAt: retrieved.toISOString(),
        expiresAt: retrieved.getTime() + cacheTtlMs,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function get(
    filters: { fromMonth?: string; toMonth?: string } = {},
  ) {
    if (
      filters.fromMonth !== undefined && !isMonth(filters.fromMonth) ||
      filters.toMonth !== undefined && !isMonth(filters.toMonth)
    ) {
      throw new Error("Use YYYY-MM values for month filters.");
    }
    if (filters.fromMonth && filters.toMonth && filters.fromMonth > filters.toMonth) {
      throw new Error("The start month must not be after the end month.");
    }

    const currentTime = now();
    if (cache && currentTime.getTime() < cache.expiresAt) {
      return toLabourForceResponse(cache, { ...filters, now: currentTime });
    }

    try {
      cache = await download();
      return toLabourForceResponse(cache, { ...filters, now: now() });
    } catch (error) {
      if (!cache) throw error;
      return toLabourForceResponse(cache, {
        ...filters,
        fallbackUsed: true,
        now: now(),
      });
    }
  }

  async function refresh() {
    const downloaded = await download();
    cache = downloaded;
    return {
      status: "refreshed" as const,
      retrievedAt: downloaded.retrievedAt,
      observationsLoaded: downloaded.observations.length,
      latestObservationDate: downloaded.observations.at(-1)!.date,
    };
  }

  return { get, refresh };
}

export const dosmLabourForceService = createDosmLabourForceService();
