/** Pure, dependency-free locale helpers (unit-testable without a DOM). */
export const LOCALES = ['en', 'ms', 'zh-CN', 'zh-TW', 'ko', 'ta', 'ja', 'id'] as const;
export type Locale = typeof LOCALES[number];
export const DEFAULT_LOCALE: Locale = 'en';
/** Separate key: only the language preference is stored here, never profile data. */
export const LOCALE_STORAGE_KEY = 'futureready.language.v1';

/** Native-script label plus a short familiar name where useful. */
export const LOCALE_LABELS: Record<Locale, { native: string; familiar?: string }> = {
  en: { native: 'English' },
  ms: { native: 'Bahasa Melayu', familiar: 'Malay' },
  'zh-CN': { native: '简体中文', familiar: 'Simplified Chinese' },
  'zh-TW': { native: '繁體中文', familiar: 'Traditional Chinese' },
  ko: { native: '한국어', familiar: 'Korean' },
  ta: { native: 'தமிழ்', familiar: 'Tamil' },
  ja: { native: '日本語', familiar: 'Japanese' },
  id: { native: 'Bahasa Indonesia', familiar: 'Indonesian' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export type StoredLocale = { locale: Locale | null; available: boolean };

/** Returns a valid saved locale, or null for missing/corrupt values. Blocked storage reports available=false. */
export function readStoredLocale(storage: ReadableStorage | null | undefined): StoredLocale {
  if (!storage) return { locale: null, available: false };
  try {
    const raw = storage.getItem(LOCALE_STORAGE_KEY);
    return { locale: isLocale(raw) ? raw : null, available: true };
  } catch {
    return { locale: null, available: false };
  }
}

/** Persists only the locale code. Returns false when storage is blocked or full. */
export function writeStoredLocale(storage: WritableStorage | null | undefined, locale: Locale): boolean {
  if (!storage || !isLocale(locale)) return false;
  try { storage.setItem(LOCALE_STORAGE_KEY, locale); return true; } catch { return false; }
}

/** Best-effort initial highlight in the chooser from browser languages; never auto-saved. */
export function matchBrowserLocale(languages: readonly string[] | undefined): Locale {
  for (const raw of languages ?? []) {
    const tag = raw.toLowerCase();
    if (tag.startsWith('zh')) return /tw|hk|mo|hant/.test(tag) ? 'zh-TW' : 'zh-CN';
    const base = tag.split('-')[0];
    const hit = LOCALES.find(l => l === base);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}

/** Replaces {name} placeholders; unknown placeholders are left visible. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function safeLocalStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
