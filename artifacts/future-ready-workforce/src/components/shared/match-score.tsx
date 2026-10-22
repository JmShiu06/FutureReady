/**
 * The single renderer for every score shown in Careers & jobs and its detail views.
 * It never calculates a score: callers pass the value already returned by the
 * existing deterministic service or API, plus which metric that value means.
 */
export type MatchMetric = 'coverage' | 'overlap' | 'exact' | 'onet';

export const matchMetricMeta: Record<MatchMetric, { label: string; short: string; meaning: string }> = {
  coverage: {
    label: 'Illustrative proficiency coverage',
    short: 'proficiency coverage',
    meaning: 'Your self-rated levels against a fictional sample role. Not a hiring probability.',
  },
  overlap: {
    label: 'Exact / related skill overlap',
    short: 'skill overlap',
    meaning: 'Share of listed skills that appear in your saved profile by name or a reviewed related phrase. Not a hiring probability.',
  },
  exact: {
    label: 'Exact skill overlap',
    short: 'exact overlap',
    meaning: 'Share of the listing requirements that appear in your saved profile by exact name. Not a hiring probability.',
  },
  onet: {
    label: 'O*NET documented skill overlap',
    short: 'O*NET overlap',
    meaning: 'Documented O*NET skills for the mapped occupation that appear in your profile by name. US reference data, not local demand.',
  },
};

type Props = {
  metric: MatchMetric;
  /** Score already provided by the source (0-100). */
  value: number;
  /** Optional matched / considered counts as supplied by the source. */
  matched?: number;
  considered?: number;
  variant?: 'pill' | 'bar' | 'panel';
  testId?: string;
  className?: string;
};

export function MatchScore({ metric, value, matched, considered, variant = 'pill', testId, className = '' }: Props) {
  const meta = matchMetricMeta[metric];
  const clamped = Math.max(0, Math.min(100, value));
  const counts = matched !== undefined && considered !== undefined ? `${matched} of ${considered}` : null;
  const aria = `${meta.label}: ${value}%${counts ? `, ${counts} skills` : ''}`;
  if (variant === 'pill') {
    return <span className={`ms ms-pill ms-${metric} ${className}`} title={meta.meaning} aria-label={aria} data-testid={testId}>
      <b>{value}%</b><span>{meta.short}</span>
    </span>;
  }
  if (variant === 'bar') {
    return <div className={`ms ms-bar ms-${metric} ${className}`} data-testid={testId}>
      <div className="ms-bar-head"><span className="ms-label">{meta.label}</span><b className="mono">{value}%{counts && <small> · {counts}</small>}</b></div>
      <div className="ms-track" role="img" aria-label={aria}><i style={{ transform: `scaleX(${clamped / 100})` }} /></div>
    </div>;
  }
  return <div className={`ms ms-panel ms-${metric} ${className}`} data-testid={testId}>
    <div className="ms-dial" role="img" aria-label={aria} style={{ ['--ms-v' as string]: `${clamped * 3.6}deg` }}><span>{value}%</span></div>
    <div className="ms-copy"><strong>{meta.label}</strong>{counts && <span className="mono">{counts} skills</span>}<span>{meta.meaning}</span></div>
  </div>;
}
