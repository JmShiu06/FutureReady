import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Compass, FlaskConical, Info, UserRound, Users, Workflow } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { aggregateRecords, audienceLabels, demoRoles } from '@/domain/demo-data';
import { assessRole, rankCareers } from '@/domain/services';
import { Bar, GapStatus, PageHead, PriorityTag, SectionTitle, SkillMeter } from '@/components/workspace/ui';

function AggregateOverview() {
  const { state } = useWorkspace();
  const isHr = state.audience === 'hr';
  const stats = useMemo(() => {
    const assessed = aggregateRecords.map(r => assessRole(r, demoRoles.find(d => d.id === r.targetRoleId)!));
    const avg = Math.round(assessed.reduce((t, a) => t + a.readiness, 0) / assessed.length);
    const counts = new Map<string, number>();
    assessed.forEach(a => a.gaps.forEach(g => counts.set(g.name, (counts.get(g.name) ?? 0) + 1)));
    const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4);
    const groups = new Set(aggregateRecords.map(r => isHr ? r.group : r.programme)).size;
    return { avg, top, groups };
  }, [isHr]);
  return <>
    <PageHead eyebrow={`${audienceLabels[state.audience]} · aggregate view`} title={isHr ? 'Plan team reskilling from aggregate patterns.' : 'See where your cohorts need support.'}
      subtitle="Views use 12 synthetic records only. Nothing here ranks or decides about an individual." />
    <section className="grid-3">
      <div className="panel kpi"><span>Synthetic records</span><strong data-testid="stat-records">{aggregateRecords.length}</strong><small>Fictional, no personal data</small></div>
      <div className="panel kpi"><span>{isHr ? 'Departments' : 'Programmes'}</span><strong>{stats.groups}</strong><small>Available as filters</small></div>
      <div className="panel kpi"><span>Average coverage</span><strong data-testid="stat-avg-coverage">{stats.avg}%</strong><small>Illustrative, toward each record's target role</small></div>
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Most common skill gaps" note="COUNT OF RECORDS BELOW TARGET" />
        <div className="gap-list">{stats.top.map(([name, n]) => <div className="gap-row" key={name}><span><strong>{name}</strong><small>{n} of {aggregateRecords.length} records below the target level</small></span><span className="gap-tag">{n}</span></div>)}</div>
        <div className="row" style={{ marginTop: 16 }}>
          <Link href="/team" className="btn btn-primary" data-testid="link-dashboard-team"><Users size={14} /> Open {isHr ? 'team' : 'cohort'} planning</Link>
          <Link href="/scenarios" className="btn btn-secondary" data-testid="link-dashboard-scenarios">Compare AI scenarios</Link>
        </div>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Use responsibly" note="BOUNDARIES" />
        <p className="muted">Aggregates support learning investment and curriculum conversations. They are not for hiring, ranking or performance decisions about named people.</p>
        <div className="row"><Link href="/trends" className="text-link" data-testid="link-dashboard-trends">Skills radar <ArrowRight size={12} /></Link><Link href="/sdgs" className="text-link" data-testid="link-dashboard-sdgs">SDG explorer <ArrowRight size={12} /></Link></div>
      </div>
    </section>
  </>;
}

function PersonalOverview() {
  const { state, profile, targetRoleId } = useWorkspace();
  const ranked = useMemo(() => rankCareers(profile), [profile]);
  const target = demoRoles.find(r => r.id === targetRoleId) ?? demoRoles[0];
  const targetAssessment = useMemo(() => assessRole(profile, target), [profile, target]);
  const transferable = profile.skills.filter(s => demoRoles.filter(r => r.requiredSkills.some(q => q.name.toLowerCase() === s.name.toLowerCase())).length >= 2);
  const graduate = state.audience === 'graduate';
  const audienceDetails = graduate
    ? [profile.qualification, profile.studyField].filter(Boolean).join(' · ')
    : profile.experienceYears === null ? '' : `${profile.experienceYears} years of experience`;
  const profileContext = [
    audienceDetails,
    profile.location,
    profile.workPreference,
    profile.learningHours === null ? '' : `${profile.learningHours} learning hrs/week`,
    profile.budgetMYR === null ? '' : `budget MYR ${profile.budgetMYR}`,
  ].filter(Boolean).join(' · ');
  return <>
    <PageHead eyebrow={`${audienceLabels[state.audience]} · your workspace`} title={graduate ? 'Turn your studies into a first career move.' : 'Make your next move with a little more clarity.'}
      subtitle="Explore where your skills could travel and what might help you get there." action={<Link href="/profile" className="btn btn-secondary" data-testid="link-edit-profile"><UserRound size={14} /> Edit profile</Link>} />
    <section className="hero-grid">
      <div className="welcome-card">
        <div className="eyebrow">Starting from</div>
        <h1 data-testid="text-dashboard-occupation">{profile.occupation || 'Your career profile'}</h1>
        <p>{profileContext || 'Add relevant About You details in My profile to personalize this context.'}</p>
        <div className="welcome-actions"><Link href="/careers" className="btn btn-primary" data-testid="link-explore-careers"><Compass size={14} /> Explore career paths <ArrowRight size={14} /></Link><Link href="/roadmap" className="btn btn-quiet" data-testid="link-roadmap">View my roadmap</Link></div>
      </div>
      <div className="panel stat-card">
        <div className="stat-top"><span>Coverage toward target</span><Workflow size={16} /></div>
        <div><div className="stat-number" data-testid="stat-target-coverage">{targetAssessment.readiness}<span style={{ fontSize: 17 }}>%</span></div><div className="stat-foot">{target.title}</div></div>
        <div className="section-kicker">Illustrative skill coverage, not job probability</div>
      </div>
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Transition options" note="RANKED BY ILLUSTRATIVE COVERAGE" action={<Link href="/careers" className="text-link">All careers <ArrowRight size={12} /></Link>} />
        <div className="stack">{ranked.slice(0, 3).map((a, i) => <Link href={`/roles/${a.role.id}`} key={a.role.id} className="role-card" data-testid={`link-dashboard-role-${a.role.id}`}>
          <div className="spread"><span className="row"><span className="rank">#{i + 1}</span><strong style={{ fontSize: 12 }}>{a.role.title}</strong></span><span className="match-pill">{a.readiness}% coverage</span></div>
          <Bar value={a.readiness} label={`${a.readiness}% coverage`} />
          <span className="muted small">{a.missing.length} missing · {a.gaps.length - a.missing.length} below target · {a.role.demandLabel}</span>
        </Link>)}</div>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Transferable skills" note="USED BY 2+ SAMPLE ROLES" />
        {transferable.length ? <div className="stack">{transferable.map(s => <div key={s.name}><div className="spread small"><strong>{s.name}</strong><span className="mono">{s.level}/5</span></div><SkillMeter level={s.level} /></div>)}</div>
          : <p className="muted">None of your skills appear in two or more sample roles yet. <Link href="/profile" className="text-link">Add skills</Link></p>}
      </div>
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title={`Gaps for ${target.title}`} note="YOUR CURRENT TARGET" action={<Link href="/twin" className="text-link" data-testid="link-dashboard-twin"><FlaskConical size={12} /> Try what-if</Link>} />
        {targetAssessment.gaps.length ? <div className="gap-list">{targetAssessment.gaps.map(g => <div className="gap-row" key={g.name}><span><strong>{g.name}</strong><PriorityTag priority={g.priority} /></span><GapStatus gap={g} /></div>)}</div>
          : <p className="muted">You meet every sample requirement for this role.</p>}
        <Link href="/roadmap" className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} data-testid="link-dashboard-roadmap">Open learning roadmap <ArrowRight size={14} /></Link>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Task exposure" note="DESCRIPTIVE, NOT A PREDICTION" />
        <p className="muted" data-testid="text-task-exposure">{target.taskExposure}</p>
        <div className="disclaimer"><Info size={14} /><span>Hand-written description of a fictional role. It does not estimate automation risk or job loss.</span></div>
      </div>
    </section>
  </>;
}

export default function DashboardPage() {
  const { state } = useWorkspace();
  return state.audience === 'hr' || state.audience === 'education' ? <AggregateOverview /> : <PersonalOverview />;
}
