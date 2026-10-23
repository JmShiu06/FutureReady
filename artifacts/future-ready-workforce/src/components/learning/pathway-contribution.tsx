import type { PathwayPlan } from '@/domain/reskilling-pathway';
export function PathwayContribution({ plan }: { plan: PathwayPlan }) {
  const targets = [...new Map(plan.steps.flatMap(s => s.sdgTargets ?? []).map(t => [t.target, t])).values()];
  return <details className="card-more" data-testid="pathway-sdg-contribution"><summary>How your path contributes</summary>
    <p className="small">Conditional learning and practice intentions, not measured impact. Hours can support more than one target; do not add these rows together.</p>
    {targets.map(t => {
      const steps = plan.steps.filter(s => s.sdgTargets?.some(x => x.target === t.target));
      const unknown = steps.filter(s => s.hours === null).length;
      return <div key={t.target} className="small" style={{ marginBottom: 12 }}>
        <b><a href={t.sourceUrl} target="_blank" rel="noreferrer">SDG target {t.target}</a> · {steps.length} steps · {steps.reduce((sum, s) => sum + (s.hours ?? 0), 0)} known hours{unknown ? ` + ${unknown} unstated` : ''}</b>
        <p>{t.reason}</p><details><summary>Steps for this target</summary><ul>{steps.map(s => <li key={s.id}>{s.skill} · {s.hours === null ? 'hours unknown' : `${s.hours}h`}</li>)}</ul></details>
      </div>;
    })}
  </details>;
}
