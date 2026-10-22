import { Leaf } from 'lucide-react';
import { sdgGoals, sdgMappings } from '@/domain/demo-data';
import { AiExplainButton } from '@/components/ai-drawer';

/** SDG relevance folded into role cards. Relevance to a cited UN target is never measured impact. */
export function SdgTags({ roleId, compact = false }: { roleId: string; compact?: boolean }) {
  const maps = sdgMappings.filter(m => m.roleId === roleId);
  if (!maps.length) return compact
    ? <span className="tag tag-low" title="No reviewed SDG mapping is available for this role. No contribution or impact is implied." data-testid={`text-sdg-none-${roleId}`}>SDG relevance not assessed</span>
    : <p className="muted small" data-testid={`text-sdg-none-${roleId}`}>No sample SDG mapping for this role. We do not map every role to a goal.</p>;
  return <div className="sdg-tags" data-testid={`sdg-tags-${roleId}`}>
    {maps.map(m => {
      const goal = sdgGoals.find(g => g.number === m.goal);
      const supported = m.status === 'source-supported';
      return <details key={m.goal} className={`sdg-tag ${supported ? 'supported' : 'unverified'}`} data-testid={`sdg-tag-${roleId}-${m.goal}`}>
        <summary><Leaf size={11} aria-hidden="true" /><b>SDG {m.goal}</b><span>{supported ? 'Source-supported relevance' : 'Unverified example'}</span></summary>
        <div className="sdg-tag-body">
          <strong>{goal?.name ?? `Goal ${m.goal}`}</strong>
          <p>{m.explanation}</p>
          {m.skills.length > 0 && <div className="row">{m.skills.map(s => <span key={s} className="chip">{s}</span>)}</div>}
          {m.sourceUrl && m.sourceTitle
            ? <p className="small"><b>Source{m.sourceDate ? ` (${m.sourceDate})` : ''}:</b> <a className="text-link" href={m.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-sdg-source-${roleId}-${m.goal}`}>{m.sourceTitle}</a>{m.sourceObservation && <span className="muted"> · {m.sourceObservation}</span>}</p>
            : <p className="small muted">No supporting citation supplied.</p>}
          <p className="small muted">Relevance to a cited UN target only. Not proof of contribution or measured impact.</p>
          <AiExplainButton request={{ feature: 'sdg-contribution', goal: m.goal }} label={`Explain SDG ${m.goal} with AI`} testId={`button-ai-sdg-${roleId}-${m.goal}`} small />
        </div>
      </details>;
    })}
  </div>;
}
