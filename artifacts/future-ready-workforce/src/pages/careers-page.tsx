import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { BuildRoadmapButton } from '@/components/build-roadmap-button';
import { planKey } from '@/domain/learning';
import { useWorkspace } from '@/domain/workspace-context';
import { demoService } from '@/domain/services';
import { ErrorBlock, GapStatus, LoadingBlock, PriorityTag, useAsync } from '@/components/workspace/ui';
import { OfficialOccupationsPanel, OccupationComparisonPanel, useOccupationEvidence } from '@/components/workspace/occupation-evidence';
import { MatchScore } from '@/components/shared/match-score';
import { SdgTags } from '@/components/shared/sdg-tags';

const hiddenRecommendationRoleIds = new Set([
  'ai-operations',
  'service-designer',
  'learning-partner',
  'workforce-analyst',
]);

/** Career paths tab: sample-role coverage, SDG relevance tags and official occupation evidence. */
export function CareerPathsTab() {
  const { profile, state, targetRoleId } = useWorkspace();
  const occupationQuery = useOccupationEvidence();
  const roadmapTarget = (id: string) => id === targetRoleId && !!state.baselines[planKey(state.audience, id)];
  const key = `${state.audience}:${JSON.stringify(profile.skills)}`;
  const result = useAsync(signal => demoService.matchCareers(profile, signal), key);
  const list = result.data ?? [];
  const recommendationCards = list.filter(x => !hiddenRecommendationRoleIds.has(x.role.id));
  return <>
    <div className="tab-intro">
      <p className="muted">Sample career paths ranked by <b>illustrative proficiency coverage</b>, with SDG relevance tags. Malaysian critical occupations below use a separate <b>O*NET documented overlap</b> count.</p>
      <Link href="/market-and-ai-impact?tab=ai-impact" className="btn btn-secondary btn-small" data-testid="link-ai-career-explanation">Open AI Career Explanation</Link>
    </div>
    {result.status === 'loading' && !result.data && <LoadingBlock rows={4} />}
    {result.status === 'error' && <ErrorBlock message={result.error ?? 'Could not rank careers.'} onRetry={result.retry} />}
    {result.status !== 'error' && result.data && recommendationCards.length > 0 && <div className="grid-2">{recommendationCards.map((x, i) => <article key={x.role.id} className={`role-card${roadmapTarget(x.role.id) ? ' selected' : ''}`} data-testid={`card-career-${x.role.id}`}>
        <div className="spread"><span className="row"><span className="rank">#{i + 1}</span><strong>{x.role.title}</strong></span>{roadmapTarget(x.role.id) && <span className="match-pill">Roadmap target</span>}</div>
        <span className="muted small">{x.role.category} · {x.role.industry}</span>
        <p className="muted" style={{ margin: 0 }}>{x.role.description}</p>
        <MatchScore metric="coverage" value={x.readiness} variant="bar" testId={`text-score-${x.role.id}`} />
        <div className="small">Demand label (not readiness): <b>{x.role.demandLabel}</b></div>
        <div className="small" data-testid={`text-skill-counts-${x.role.id}`}>{x.role.requiredSkills.length} required · <b>{x.present.length}</b> you have (any level) · <b>{x.gaps.length}</b> remaining gap{x.gaps.length === 1 ? '' : 's'}</div>
        <details className="card-more"><summary>Skill-by-skill status</summary>
          <div className="stack" style={{ marginTop: 8 }}>{[...x.present, ...x.missing].map(g => <div key={g.name} className="spread small"><span className="row">{g.name}<PriorityTag priority={g.priority} /></span><GapStatus gap={g} /></div>)}</div>
        </details>
        <SdgTags roleId={x.role.id} compact />
        <div className="row">
          <BuildRoadmapButton roleId={x.role.id} testId={`button-build-roadmap-${x.role.id}`} />
          <Link href={`/careers-and-jobs/roles/${x.role.id}`} className="text-link" data-testid={`link-role-${x.role.id}`}>Role detail & evidence <ArrowRight size={12} /></Link>
        </div>
      </article>)}</div>}
    <OfficialOccupationsPanel query={occupationQuery} />
    <OccupationComparisonPanel query={occupationQuery} />
  </>;
}
