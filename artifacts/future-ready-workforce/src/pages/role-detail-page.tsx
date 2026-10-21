import { useMemo } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, BriefcaseBusiness, Check, FlaskConical, Leaf, Target, Workflow } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { demoRoles, sdgGoals, sdgMappings } from '@/domain/demo-data';
import { assessRole, methodology } from '@/domain/services';
import { ChiliProgressBar } from '@/components/chili-progress-bar';
import { EmptyBlock, EvidencePanel, GapStatus, PriorityTag, SectionTitle } from '@/components/workspace/ui';

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, targetRoleId, setTargetRole } = useWorkspace();
  const role = demoRoles.find(r => r.id === id);
  const a = useMemo(() => role ? assessRole(profile, role) : null, [profile, role]);
  if (!role || !a) return <EmptyBlock title="That sample role does not exist."><Link href="/careers" className="btn btn-primary btn-small" data-testid="link-back-careers">Back to careers</Link></EmptyBlock>;
  const sdgs = sdgMappings.filter(m => m.roleId === role.id);
  return <>
    <div className="row" style={{ marginBottom: 14 }}><Link href="/careers" className="text-link" data-testid="link-back-careers"><ArrowLeft size={12} /> Career explorer</Link></div>
    <div className="role-hero">
      <div className="eyebrow">{role.category}</div><h1 data-testid="text-role-title">{role.title}</h1>
      <p className="muted" style={{ maxWidth: 690 }}>{role.description}</p>
      <div className="role-meta"><span><BriefcaseBusiness size={14} />{role.industry}</span><span><Target size={14} />{role.demandLabel}</span></div>
      <div className="row" style={{ marginTop: 16 }}>
        {targetRoleId === role.id ? <span className="match-pill"><Check size={11} /> Your current target</span>
          : <button className="btn btn-primary btn-small" onClick={() => setTargetRole(role.id)} data-testid="button-set-target">Set as my target</button>}
        <Link href="/twin" className="btn btn-secondary btn-small" data-testid="link-role-twin"><FlaskConical size={12} /> Simulate</Link>
        <Link href="/roadmap" className="btn btn-secondary btn-small" data-testid="link-role-roadmap"><Workflow size={12} /> Roadmap</Link>
      </div>
    </div>
    <div className="detail-layout">
      <div className="stack">
        <div className="panel panel-pad">
          <SectionTitle title="Your skills against the role" note="PRESENT · BELOW TARGET · MISSING" />
          <div className="match-score" style={{ marginBottom: 14 }}><div className="score-ring" data-testid="text-role-score">{a.readiness}%</div><div className="score-copy"><strong>Illustrative proficiency coverage</strong><span>Not a hiring probability.</span></div></div>
          <div className="gap-list">{[...a.present, ...a.missing].map(g => <div className="gap-row" key={g.name}><span><strong>{g.name}</strong><PriorityTag priority={g.priority} /></span><GapStatus gap={g} /></div>)}</div>
        </div>
        <div className="panel panel-pad"><SectionTitle title="Task exposure" note="DESCRIPTIVE, NOT A PREDICTION" /><p className="muted">{role.taskExposure}</p></div>
      </div>
      <div className="stack">
        <div className="panel panel-pad"><SectionTitle title="Methodology" /><p className="muted small">{methodology}</p><ChiliProgressBar value={a.readiness} label={`Illustrative skill coverage ${a.readiness}%`} testId="progress-coverage" /></div>
        <div className="panel panel-pad"><SectionTitle title="Evidence" /><EvidencePanel evidence={role.evidence} /></div>
        <div className="panel panel-pad"><SectionTitle title="SDG links" note="UNVERIFIED SAMPLE MAPPINGS" />
          {sdgs.length ? sdgs.map(m => <div key={m.goal} className="row small" style={{ alignItems: 'flex-start' }}><Leaf size={14} /><span><b>SDG {m.goal}: {sdgGoals.find(g => g.number === m.goal)?.name}</b><br />{m.explanation}</span></div>)
            : <p className="muted">No sample SDG mapping for this role.</p>}
          <Link href="/sdgs" className="text-link" data-testid="link-role-sdgs">Open SDG explorer</Link>
        </div>
      </div>
    </div>
  </>;
}
