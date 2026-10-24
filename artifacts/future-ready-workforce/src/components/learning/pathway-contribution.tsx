import type { PathwayPlan } from '@/domain/reskilling-pathway';
import { useI18n } from '@/i18n/i18n-context';
export function PathwayContribution({ plan }: { plan: PathwayPlan }) {
  const { t } = useI18n();
  const targets = [...new Map(plan.steps.flatMap(s => s.sdgTargets ?? []).map(t => [t.target, t])).values()];
  return <details className="card-more" data-testid="pathway-sdg-contribution"><summary>{t('learn.contribution')}</summary>
    <p className="small">{t('learn.contributionNote')}</p>
    <p className="small muted">{t('detail.sourceLanguage')}</p>
    {targets.map(target => {
      const steps = plan.steps.filter(s => s.sdgTargets?.some(x => x.target === target.target));
      const unknown = steps.filter(s => s.hours === null).length;
      return <div key={target.target} className="small" style={{ marginBottom: 12 }}>
        <b><a href={target.sourceUrl} target="_blank" rel="noreferrer">{t('learn.target', { n: target.target })}</a> · {t('learn.targetStats', { steps: steps.length, hours: steps.reduce((sum, s) => sum + (s.hours ?? 0), 0) })}{unknown ? ` ${t('rm.unstated', { n: unknown })}` : ''}</b>
        <p>{target.reason}</p><details><summary>{t('learn.targetSteps')}</summary><ul>{steps.map(s => <li key={s.id}>{s.kind === 'project' ? t('learn.applySkills') : s.skill} · {s.hours === null ? t('learn.hoursUnknown') : t('rm.hrs', { n: s.hours })}</li>)}</ul></details>
      </div>;
    })}
  </details>;
}
