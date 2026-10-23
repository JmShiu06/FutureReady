import { Leaf } from 'lucide-react';
import { sdgGoals, sdgMappings } from '@/domain/demo-data';
import { mycolSdgMappings, type MycolSdgMapping } from '@workspace/workforce-evidence';
import { AiExplainButton } from '@/components/ai-drawer';
import { roleSdgUseCases } from '@workspace/workforce-evidence';
import { SdgUseCase } from './sdg-use-case';

/** SDG relevance folded into role cards. Relevance to a cited UN target is never measured impact. */
export function SdgTags({ roleId, compact = false }: { roleId: string; compact?: boolean }) {
  const maps = [...sdgMappings, ...mycolSdgMappings].filter(m => m.roleId === roleId);
  if (!maps.length && roleSdgUseCases[roleId]) return <SdgUseCase roleId={roleId} />;
  if (!maps.length) return compact
    ? <span className="tag tag-low" title="No reviewed SDG mapping is available for this role. No contribution or impact is implied." data-testid={`text-sdg-none-${roleId}`}>SDG relevance not assessed</span>
    : <p className="muted small" data-testid={`text-sdg-none-${roleId}`}>SDG relevance not assessed. No reviewed mapping is available for this role; this does not imply no relevance or impact.</p>;
  return <div className="sdg-tags" data-testid={`sdg-tags-${roleId}`}>
    {maps.map(m => {
      const goal = sdgGoals.find(g => g.number === m.goal);
      const supported = m.status === 'source-supported';
      const reviewed = 'citations' in m ? m as MycolSdgMapping : null;
      return <details key={m.goal} className={`sdg-tag ${supported ? 'supported' : 'unverified'}`} data-testid={`sdg-tag-${roleId}-${m.goal}`}>
        <summary><Leaf size={11} aria-hidden="true" /><b>SDG {m.goal}{reviewed ? ` · ${reviewed.target}` : ''}</b><span>{supported ? 'Source-supported relevance' : 'Unverified example'}</span></summary>
        <div className="sdg-tag-body">
          <strong>{goal?.name ?? `Goal ${m.goal}`}</strong>
          <p>{m.explanation}</p>
          {reviewed && <>
            <p className="small"><b>Application review: <time dateTime={reviewed.reviewedAt}>{reviewed.reviewedAt}</time>.</b> Not an official UN or MyCOL SDG classification.</p>
            <p className="small"><b>Scope and limits:</b> {reviewed.scope}</p>
            {reviewed.citations.map((citation, index) => <p className="small" key={citation.url}>
              <b>{citation.kind}:</b>{' '}
              <a className="text-link" href={citation.url} target="_blank" rel="noreferrer" data-testid={`link-sdg-citation-${roleId}-${m.goal}-${index}`}>{citation.title}</a>
              <span className="muted"> · {citation.observation}</span><br />
              <span className="muted">Publication date: {citation.publishedAt ?? 'not stated'} · Accessed/reviewed: <time dateTime={citation.accessedAt}>{citation.accessedAt}</time></span>
            </p>)}
          </>}
          {m.skills.length > 0 && <div className="row">{m.skills.map(s => <span key={s} className="chip">{s}</span>)}</div>}
          {m.sourceUrl && m.sourceTitle
            ? <p className="small"><b>Source{m.sourceDate ? ` (${m.sourceDate})` : ''}:</b> <a className="text-link" href={m.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-sdg-source-${roleId}-${m.goal}`}>{m.sourceTitle}</a>{m.sourceObservation && <span className="muted"> · {m.sourceObservation}</span>}</p>
            : <p className="small muted">No supporting citation supplied.</p>}
          <p className="small muted">Relevance to a cited UN target only. Not proof of contribution or measured impact.</p>
          {!reviewed && <AiExplainButton request={{ feature: 'sdg-contribution', goal: m.goal }} label={`Explain SDG ${m.goal} with AI`} testId={`button-ai-sdg-${roleId}-${m.goal}`} small />}
        </div>
      </details>;
    })}
  </div>;
}
