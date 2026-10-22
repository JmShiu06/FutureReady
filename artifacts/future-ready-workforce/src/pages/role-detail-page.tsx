import { useMemo } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, BriefcaseBusiness, Target } from 'lucide-react';
import { MatchScore } from '@/components/shared/match-score';
import { SdgTags } from '@/components/shared/sdg-tags';
import { BuildRoadmapButton } from '@/components/build-roadmap-button';
import { OccupationEvidenceDetail } from '@/components/workspace/occupation-evidence';
import { useWorkspace } from '@/domain/workspace-context';
import { demoRoles } from '@/domain/demo-data';
import { assessRole, methodology } from '@/domain/services';
import { ChiliProgressBar } from '@/components/chili-progress-bar';
import { EmptyBlock, EvidencePanel, GapStatus, PriorityTag, SectionTitle } from '@/components/workspace/ui';

export default function RoleDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  return id.startsWith('mycol-')
    ? <OccupationEvidenceDetail id={id} />
    : <SampleRoleDetail id={id} />;
}

function SampleRoleDetail({ id }: { id: string }) {
  const { profile } = useWorkspace();
  const role = demoRoles.find(r => r.id === id);
  const a = useMemo(() => role ? assessRole(profile, role) : null, [profile, role]);
  if (!role || !a) return <EmptyBlock title="That sample role does not exist."><Link href="/careers-and-jobs?tab=career-paths" className="btn btn-primary btn-small" data-testid="link-back-careers">Back to career paths</Link></EmptyBlock>;
  return <>
    <div className="row" style={{ marginBottom: 14 }}><Link href="/careers-and-jobs?tab=career-paths" className="text-link" data-testid="link-back-careers"><ArrowLeft size={12} /> Career paths</Link></div>
    <div className="role-hero">
      <div className="eyebrow">{role.category}</div><h1 data-testid="text-role-title">{role.title}</h1>
      <p className="muted" style={{ maxWidth: 690 }}>{role.description}</p>
      <div className="role-meta"><span><BriefcaseBusiness size={14} />{role.industry}</span><span><Target size={14} />{role.demandLabel}</span></div>
      <div className="row" style={{ marginTop: 16 }}>
        <BuildRoadmapButton roleId={role.id} testId="button-build-roadmap" />
        <Link href="/market-and-ai-impact?tab=ai-impact" className="btn btn-secondary btn-small" data-testid="link-ai-career-explanation">Open AI Career Explanation</Link>
      </div>
    </div>
    <div className="detail-layout">
      <div className="stack">
        <div className="panel panel-pad">
          <SectionTitle title="Your skills against the role" note="PRESENT · BELOW TARGET · MISSING" />
          <MatchScore metric="coverage" variant="panel" value={a.readiness} className="ms-spaced-bottom" testId="text-role-score" />
          <div className="gap-list">{[...a.present, ...a.missing].map(g => <div className="gap-row" key={g.name}><span><strong>{g.name}</strong><PriorityTag priority={g.priority} /></span><GapStatus gap={g} /></div>)}</div>
        </div>
        <div className="panel panel-pad"><SectionTitle title="Task exposure" note="DESCRIPTIVE, NOT A PREDICTION" /><p className="muted">{role.taskExposure}</p></div>
      </div>
      <div className="stack">
        <div className="panel panel-pad"><SectionTitle title="Methodology" /><p className="muted small">{methodology}</p><ChiliProgressBar value={a.readiness} label={`Illustrative skill coverage ${a.readiness}%`} testId="progress-coverage" /></div>
        <div className="panel panel-pad"><SectionTitle title="Evidence" /><EvidencePanel evidence={role.evidence} /></div>
        <div className="panel panel-pad"><SectionTitle title="SDG relevance" note="SOURCE-SUPPORTED OR UNVERIFIED · NOT IMPACT" />
          <SdgTags roleId={role.id} />
        </div>
      </div>
    </div>
  </>;
}
