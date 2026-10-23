import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Globe, Info } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, interpolate, matchBrowserLocale, readStoredLocale, safeLocalStorage, writeStoredLocale, type Locale } from './locales';
import { translate, type MessageKey } from './messages';
import { RaccoonArt } from '@/components/brand/raccoon-art';
import './i18n.css';

type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string;
type I18nValue = { locale: Locale; setLocale: (l: Locale) => void; t: TFn; sessionOnly: boolean };

const I18nContext = createContext<I18nValue | null>(null);
const makeT = (locale: Locale): TFn => (key, vars) => interpolate(translate(locale, key), vars);

export function I18nProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readStoredLocale(safeLocalStorage()), []);
  const [locale, setLocaleState] = useState<Locale>(initial.locale ?? 'en');
  const [needsChoice, setNeedsChoice] = useState(initial.locale === null);
  const [sessionOnly, setSessionOnly] = useState(false);

  useLayoutEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setSessionOnly(!writeStoredLocale(safeLocalStorage(), next));
  }, []);
  const t = useMemo(() => makeT(locale), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t, sessionOnly }), [locale, setLocale, t, sessionOnly]);

  return <I18nContext.Provider value={value}>
    {children}
    {needsChoice && <LanguageChooser onDone={l => { setLocale(l); setNeedsChoice(false); }} />}
  </I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

function LanguageChooser({ onDone }: { onDone: (l: Locale) => void }) {
  const [picked, setPicked] = useState<Locale>(() => matchBrowserLocale(typeof navigator === 'undefined' ? [] : navigator.languages));
  const t = useMemo(() => makeT(picked), [picked]);
  const firstRef = useRef<HTMLInputElement | null>(null);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    document.querySelector<HTMLInputElement>(`input[name="fr-lang"][value="${picked}"]`)?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement?.getAttribute('name') === 'fr-lang') { e.preventDefault(); continueRef.current?.focus(); }
    else if (!e.shiftKey && document.activeElement === continueRef.current) { e.preventDefault(); document.querySelector<HTMLInputElement>('input[name="fr-lang"]:checked')?.focus(); }
  };
  return <div className="lang-overlay" data-testid="dialog-language-chooser">
    <div className="lang-dialog" role="dialog" aria-modal="true" aria-labelledby="lang-title" aria-describedby="lang-body" lang={picked} onKeyDown={trap}>
      <div className="lang-head">
        <RaccoonArt name="waving" size={72} className="lang-raccoon" />
        <div>
          <div className="eyebrow">{t('lang.welcomeEyebrow')}</div>
          <h1 id="lang-title">{t('lang.welcomeTitle')}</h1>
          <p id="lang-body" className="page-subtitle">{t('lang.welcomeBody')}</p>
        </div>
      </div>
      <form onSubmit={e => { e.preventDefault(); onDone(picked); }}>
        <fieldset className="lang-grid">
          <legend className="sr-only">{t('lang.label')}</legend>
          {LOCALES.map((l, i) => <label key={l} className={`lang-option${picked === l ? ' on' : ''}`} lang={l} data-testid={`option-language-${l}`}>
            <input ref={i === 0 ? firstRef : undefined} type="radio" name="fr-lang" value={l} checked={picked === l} onChange={() => setPicked(l)} />
            <span className="lang-native">{LOCALE_LABELS[l].native}</span>
            {LOCALE_LABELS[l].familiar && <span className="lang-familiar" lang="en">{LOCALE_LABELS[l].familiar}</span>}
          </label>)}
        </fieldset>
        <p className="lang-note"><Info size={14} aria-hidden="true" /><span>{t('lang.sourceNote')}</span></p>
        <p className="lang-note subtle">{t('lang.privacy')}</p>
        <div className="lang-actions"><button ref={continueRef} type="submit" className="btn btn-primary" data-testid="button-language-continue">{t('lang.continue')}</button></div>
      </form>
    </div>
  </div>;
}

/** Compact native select; works with keyboard and screen readers on desktop and mobile. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return <label className="lang-switch" title={t('lang.switch')}>
    <Globe size={14} aria-hidden="true" />
    <span className="sr-only">{t('lang.switch')}</span>
    <select value={locale} onChange={e => setLocale(e.target.value as Locale)} data-testid="select-language">
      {LOCALES.map(l => <option key={l} value={l} lang={l}>{LOCALE_LABELS[l].native}{LOCALE_LABELS[l].familiar ? ` · ${LOCALE_LABELS[l].familiar}` : ''}</option>)}
    </select>
  </label>;
}
