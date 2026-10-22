import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export type TabDef<K extends string> = { key: K; label: string; icon?: ReactNode };

/** WAI-ARIA tablist whose selection lives in the URL (back/forward and deep links work). */
export function UrlTabs<K extends string>({ tabs, active, onSelect, label, idPrefix }: {
  tabs: TabDef<K>[]; active: K; onSelect: (key: K) => void; label: string; idPrefix: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const key = tabs[next].key;
    onSelect(key);
    refs.current[key]?.focus();
  };
  return <div className="url-tabs" role="tablist" aria-label={label}>
    {tabs.map((t, i) => <button key={t.key} ref={el => { refs.current[t.key] = el; }} id={`${idPrefix}-tab-${t.key}`} role="tab" type="button"
      aria-selected={active === t.key} aria-controls={`${idPrefix}-panel-${t.key}`} tabIndex={active === t.key ? 0 : -1}
      className={`url-tab${active === t.key ? ' active' : ''}`} onClick={() => onSelect(t.key)} onKeyDown={e => onKey(e, i)} data-testid={`tab-${idPrefix}-${t.key}`}>
      {t.icon}{t.label}
    </button>)}
  </div>;
}

export function TabPanel({ idPrefix, tab, children }: { idPrefix: string; tab: string; children: ReactNode }) {
  return <div id={`${idPrefix}-panel-${tab}`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${tab}`} tabIndex={0} className="url-tabpanel" data-testid={`panel-${idPrefix}-${tab}`}>{children}</div>;
}
