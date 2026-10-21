import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { Evidence, RequiredSkill, SkillGap } from '@/domain/types';
import { evidenceWarnings } from '@/domain/services';

export function SectionTitle({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return <div className="section-head"><div><h2>{title}</h2>{note && <div className="section-kicker">{note}</div>}</div>{action}</div>;
}

export function PageHead({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{action}</div>;
}

export function SkillMeter({ level }: { level: number }) {
  return <div className="skill-meter" aria-label={`Level ${level} of 5`}>{[1, 2, 3, 4, 5].map(n => <i className={n <= level ? 'on' : ''} key={n} />)}</div>;
}

export function Bar({ value, alt, label }: { value: number; alt?: boolean; label: string }) {
  return <div className={`bar-track${alt ? ' alt' : ''}`} role="img" aria-label={label}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function PriorityTag({ priority }: { priority: RequiredSkill['priority'] }) {
  return <span className={`tag tag-${priority.toLowerCase()}`}>{priority} priority</span>;
}

export function GapStatus({ gap }: { gap: SkillGap }) {
  if (gap.currentLevel === 0) return <span className="tag tag-miss">Missing · needs {gap.level}</span>;
  if (gap.gap > 0) return <span className="tag tag-below">Below target · {gap.currentLevel}/{gap.level}</span>;
  return <span className="tag tag-ok">Meets target · {gap.currentLevel}/{gap.level}</span>;
}

export function EvidencePanel({ evidence, testId = 'panel-evidence' }: { evidence: Evidence; testId?: string }) {
  const warnings = evidenceWarnings(evidence);
  return <div className="evidence" data-testid={testId}>
    <dl>
      <dt>Evidence type</dt><dd>{evidence.kind === 'synthetic' ? 'Synthetic (fictional)' : 'Observed'}</dd>
      <dt>Source name</dt><dd>{evidence.sourceName}</dd>
      <dt>Source URL</dt><dd>{evidence.sourceUrl ? <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="text-link">{evidence.sourceUrl}</a> : 'None — no verified source URL'}</dd>
      <dt>Observation period</dt><dd>{evidence.observationStart ?? 'Unknown'} to {evidence.observationEnd ?? 'Unknown'}</dd>
      <dt>Last updated</dt><dd>{evidence.lastUpdated ?? 'Missing'}</dd>
      <dt>Notes</dt><dd>{evidence.notes}</dd>
    </dl>
    {warnings.length > 0 && <ul className="warn-list" data-testid={`${testId}-warnings`}>{warnings.map(w => <li key={w}>{w}</li>)}</ul>}
  </div>;
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <div className="stack" role="status" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}</div>;
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="state-box" role="alert" data-testid="state-error"><AlertTriangle size={20} /><strong>{message}</strong>
    <button className="btn btn-secondary btn-small" onClick={onRetry} data-testid="button-retry"><RotateCcw size={12} /> Try again</button></div>;
}

export function EmptyBlock({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="state-box" data-testid="state-empty"><strong>{title}</strong>{children}</div>;
}

type AsyncState<T> = { status: 'loading' | 'error' | 'success'; data?: T; error?: string };
/** Runs an async (abortable) operation whenever `key` changes. Retry re-runs it. */
export function useAsync<T>(run: (signal: AbortSignal) => Promise<T>, key: string) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const ctrl = new AbortController();
    setState(s => ({ status: 'loading', data: s.data }));
    runRef.current(ctrl.signal).then(
      data => { if (!ctrl.signal.aborted) setState({ status: 'success', data }); },
      e => { if (!ctrl.signal.aborted) setState({ status: 'error', error: e instanceof Error ? e.message : 'Something went wrong.' }); },
    );
    return () => ctrl.abort();
  }, [key, nonce]);
  return { ...state, retry: () => setNonce(n => n + 1) };
}

export const levelLabel = (level: number) => ['Not present', 'New to it', 'Exploring', 'Working knowledge', 'Confident', 'Can coach'][level] ?? 'Not present';
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
