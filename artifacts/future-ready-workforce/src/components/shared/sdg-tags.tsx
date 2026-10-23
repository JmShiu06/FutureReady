import { Leaf } from 'lucide-react';
import { sdgGoals, sdgMappings } from '@/domain/demo-data';
import { mycolSdgMappings, type MycolSdgMapping } from '@workspace/workforce-evidence';
import { AiExplainButton } from '@/components/ai-drawer';
import { roleSdgUseCases } from '@workspace/workforce-evidence';
import { SdgUseCase } from './sdg-use-case';
import { useI18n } from '@/i18n/i18n-context';

/** SDG relevance folded into role cards. Relevance to a cited UN target is never measured impact. */
export function SdgTags({ roleId, compact = false }: { roleId: string; compact?: boolean }) {
  const { t } = useI18n();
  const maps = [...sdgMappings, ...mycolSdgMappings].filter(m => m.roleId === roleId);
  if (!maps.length && roleSdgUseCases[roleId]) return <SdgUseCase roleId={roleId} />;
  if (!maps.length) return compact
    ? <span className="tag tag-low" title={t('sdg.unassessedNote')} data-testid={`text-sdg-none-${roleId}`}>{t('sdg.unassessed')}</span>
    : <p className="muted small" data-testid={`text-sdg-none-${roleId}`}>{t('sdg.unassessed')}. {t('sdg.unassessedNote')}</p>;
  return <div className="sdg-tags" data-testid={`sdg-tags-${roleId}`}>
    {maps.map(m => {
      const goal = sdgGoals.find(g => g.number === m.goal);
      const supported = m.status === 'source-supported';
      const reviewed = 'citations' in m ? m as MycolSdgMapping : null;
      return <details key={m.goal} className={`sdg-tag ${supported ? 'supported' : 'unverified'}`} data-testid={`sdg-tag-${roleId}-${m.goal}`}>
        <summary><Leaf size={11} aria-hidden="true" /><b>SDG {m.goal}{reviewed ? ` · ${reviewed.target}` : ''}</b><span>{t(supported ? 'sdg.supported' : 'sdg.unverified')}</span></summary>
        <div className="sdg-tag-body">
          <p className="small muted">{t('detail.sourceLanguage')}</p>
          <strong>{goal?.name ?? `Goal ${m.goal}`}</strong>
          <p>{m.explanation}</p>
          {reviewed && <>
            <p className="small">{t('sdg.reviewNote', { date: reviewed.reviewedAt })}</p>
            <p className="small"><b>{t('sdg.scope')}:</b> {reviewed.scope}</p>
            {reviewed.citations.map((citation, index) => <p className="small" key={citation.url}>
              <b>{citation.kind}:</b>{' '}
              <a className="text-link" href={citation.url} target="_blank" rel="noreferrer" data-testid={`link-sdg-citation-${roleId}-${m.goal}-${index}`}>{citation.title}</a>
              <span className="muted"> · {citation.observation}</span><br />
              <span className="muted">{t('sdg.citationDates', { published: citation.publishedAt ?? t('sdg.notStated'), accessed: citation.accessedAt })}</span>
            </p>)}
          </>}
          {m.skills.length > 0 && <div className="row">{m.skills.map(s => <span key={s} className="chip">{s}</span>)}</div>}
          {m.sourceUrl && m.sourceTitle
            ? <p className="small"><b>{t('learn.source')}{m.sourceDate ? ` (${m.sourceDate})` : ''}:</b> <a className="text-link" href={m.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-sdg-source-${roleId}-${m.goal}`}>{m.sourceTitle}</a>{m.sourceObservation && <span className="muted"> · {m.sourceObservation}</span>}</p>
            : <p className="small muted">{t('sdg.noCitation')}</p>}
          <p className="small muted">{t('sdg.notImpact')}</p>
          {!reviewed && <AiExplainButton request={{ feature: 'sdg-contribution', goal: m.goal }} label={t('sdg.explain', { n: m.goal })} testId={`button-ai-sdg-${roleId}-${m.goal}`} small />}
        </div>
      </details>;
    })}
  </div>;
}
