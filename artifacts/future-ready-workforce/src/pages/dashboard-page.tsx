import { useMemo } from 'react';
import { Link } from 'wouter';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight, Compass, FlaskConical, Info, UserRound, Users, Workflow } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { aggregateRecords, audienceLabels, demoRoles, sdgGoals, sdgMappings } from '@/domain/demo-data';
import { assessRole, rankCareers } from '@/domain/services';
import { Bar, GapStatus, PageHead, PriorityTag, SectionTitle, SkillMeter } from '@/components/workspace/ui';

function AggregateOverview() {
  const { state } = useWorkspace();
  const isHr = state.audience === 'hr';
  const cohortRadar = useMemo(() => {
    const totals = new Map<string, { total: number; count: number }>();
    aggregateRecords.forEach(record => record.skills.forEach(skill => {
      const key = skill.name.trim();
      const current = totals.get(key) ?? { total: 0, count: 0 };
      totals.set(key, { total: current.total + skill.level, count: current.count + 1 });
    }));
    return [...totals].map(([skill, value]) => ({
      skill,
      average: Number((value.total / value.count).toFixed(1)),
      records: value.count,
    })).sort((a, b) => b.records - a.records || a.skill.localeCompare(b.skill)).slice(0, 5);
  }, []);
  const representedRoles = new Set(aggregateRecords.map(record => record.targetRoleId));
  const cohortMappings = sdgMappings.filter(mapping => representedRoles.has(mapping.roleId)).slice(0, 3);
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
    <section className="dashboard-grid">
      <div className="panel panel-pad radar-panel">
        <SectionTitle title="Cohort skill profile" note="FIVE MOST-LISTED SKILLS · SYNTHETIC RECORDS" />
        {cohortRadar.length === 5 ? <>
          <div className="personal-radar-chart" role="img" aria-label="Five-axis radar chart of average listed proficiency across synthetic cohort records" data-testid="chart-cohort-skills">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={cohortRadar} outerRadius="68%">
                <PolarGrid stroke="#dce5ef" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#60748b', fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 5]} tickCount={6} axisLine={false} tick={{ fill: '#8796a8', fontSize: 8 }} />
                <Tooltip isAnimationActive={false} formatter={value => `${Number(value).toFixed(1)}/5`} />
                <Radar name="Average listed proficiency" dataKey="average" type="natural" stroke="#1674d1" fill="#1674d1" fillOpacity={0.2} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted small radar-note">Averages include only records that list each skill. Missing skills are not counted as zero; this is a fictional cohort example, not a workforce measurement.</p>
          <ul className="radar-text-summary" aria-label="Text summary of cohort skill profile">
            {cohortRadar.map(skill => <li key={skill.skill}><strong>{skill.skill}</strong><span>{skill.average}/5 · listed in {skill.records} of {aggregateRecords.length} records</span></li>)}
          </ul>
        </> : <p className="muted">There are not yet five distinct listed skills to show.</p>}
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Sample SDG associations" note="ROLES IN THIS SYNTHETIC COHORT" />
        {cohortMappings.length ? <>
          {!cohortMappings.some(mapping => mapping.status === 'source-supported') && <div className="state-box sdg-summary-empty"><strong>No source-supported SDG associations in this cohort</strong><span>Unverified examples are listed below, but are not evidence.</span></div>}
          <div className="stack">{cohortMappings.map(mapping => {
          const goal = sdgGoals.find(item => item.number === mapping.goal);
          const role = demoRoles.find(item => item.id === mapping.roleId);
          return <article className="sdg-summary-card" key={`${mapping.roleId}-${mapping.goal}`} data-testid={`card-dashboard-cohort-sdg-${mapping.roleId}-${mapping.goal}`}>
            <div className="spread"><span className="sdg-summary-number">{mapping.goal}</span><span className="tag tag-low">{mapping.status === 'source-supported' ? 'Source-supported relevance' : 'Unverified example'}</span></div>
            <strong>{goal?.name ?? `Goal ${mapping.goal}`}</strong>
            <span className="muted small">{role?.title ?? 'Sample role'}</span>
            <p className="muted small">{mapping.explanation}</p>
            {mapping.sourceUrl && mapping.sourceTitle
              ? <div className="small"><a className="text-link" href={mapping.sourceUrl} target="_blank" rel="noreferrer">{mapping.sourceTitle}</a>{mapping.sourceDate && <span className="muted"> · {mapping.sourceDate}</span>}{mapping.sourceObservation && <p className="muted small">{mapping.sourceObservation}</p>}</div>
              : <span className="muted small">No citation supplied</span>}
          </article>;
        })}</div>
        </> : <div className="state-box sdg-summary-empty"><strong>No sample SDG associations for these records</strong><span>We do not map every role to a goal.</span></div>}
        <div className="disclaimer"><Info size={14} /><span>Source-supported means relevant to a cited UN target, not proof of contribution or measured impact. Other examples remain unverified.</span></div>
        <Link href="/sdgs" className="text-link">Explore all 17 goals <ArrowRight size={12} /></Link>
      </div>
    </section>
  </>;
}

function PersonalOverview() {
  const { state, profile, targetRoleId } = useWorkspace();
  const ranked = useMemo(() => rankCareers(profile), [profile]);
  const target = demoRoles.find(r => r.id === targetRoleId) ?? demoRoles[0];
  const targetAssessment = useMemo(() => assessRole(profile, target), [profile, target]);
  const radarSkills = useMemo(() => {
    const seen = new Set<string>();
    return ranked.slice(0, 3).flatMap(result => result.role.requiredSkills).filter(skill => {
      const key = skill.name.trim().toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5).map(required => {
      const current = profile.skills.find(skill => skill.name.trim().toLocaleLowerCase() === required.name.trim().toLocaleLowerCase());
      return { skill: required.name, profile: current?.level ?? 0, target: required.level, listed: Boolean(current) };
    });
  }, [ranked, profile.skills]);
  const targetMappings = sdgMappings.filter(mapping => mapping.roleId === target.id);
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
        <div className="welcome-actions"><Link href="/careers" className="btn btn-primary" data-testid="link-explore-careers"><Compass size={14} /> Explore career paths <ArrowRight size={14} /></Link><Link href="/profile?section=roadmap" className="btn btn-quiet" data-testid="link-roadmap">View my roadmap</Link></div>
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
        <SectionTitle title={`Gaps for ${target.title}`} note="YOUR CURRENT TARGET" action={<Link href="/profile?section=twin" className="text-link" data-testid="link-dashboard-twin"><FlaskConical size={12} /> Try what-if</Link>} />
        {targetAssessment.gaps.length ? <div className="gap-list">{targetAssessment.gaps.map(g => <div className="gap-row" key={g.name}><span><strong>{g.name}</strong><PriorityTag priority={g.priority} /></span><GapStatus gap={g} /></div>)}</div>
          : <p className="muted">You meet every sample requirement for this role.</p>}
        <Link href="/profile?section=roadmap" className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} data-testid="link-dashboard-roadmap">Open learning roadmap <ArrowRight size={14} /></Link>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Task exposure" note="DESCRIPTIVE, NOT A PREDICTION" />
        <p className="muted" data-testid="text-task-exposure">{target.taskExposure}</p>
        <div className="disclaimer"><Info size={14} /><span>Hand-written description of a fictional role. It does not estimate automation risk or job loss.</span></div>
      </div>
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-pad radar-panel">
        <SectionTitle title="Skill profile & sample target" note="FIVE SKILLS FROM YOUR TOP-RANKED ROLES" />
        {radarSkills.length === 5 ? <>
          <div className="personal-radar-chart" role="img" aria-label="Five-axis comparison of listed profile skill levels and sample role requirements" data-testid="chart-personal-skills">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarSkills} outerRadius="68%">
                <PolarGrid stroke="#dce5ef" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#60748b', fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 5]} tickCount={6} axisLine={false} tick={{ fill: '#8796a8', fontSize: 8 }} />
                <Tooltip isAnimationActive={false} formatter={(value, name, item) => [item.payload.listed || name === 'Sample target' ? `${value}/5` : 'Not listed · drawn at 0/5', name]} />
                <Radar name="Your listed level" dataKey="profile" type="natural" stroke="#1674d1" fill="#1674d1" fillOpacity={0.24} isAnimationActive={false} />
                <Radar name="Sample target" dataKey="target" type="natural" stroke="#7892ad" fill="#7892ad" fillOpacity={0.08} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="radar-legend"><span><i className="radar-dot current" /> Your listed level</span><span><i className="radar-dot sample" /> Sample target</span></div>
          <p className="muted small radar-note">A skill absent from your profile is “not listed,” not evidence of no ability. For chart geometry only, it is drawn at 0; level your profile to refine this illustrative comparison.</p>
          <ul className="radar-text-summary" aria-label="Text summary of skill comparison">
            {radarSkills.map(skill => <li key={skill.skill}><strong>{skill.skill}</strong><span>{skill.listed ? `Listed ${skill.profile}/5` : 'Not listed'} · sample target {skill.target}/5</span></li>)}
          </ul>
        </> : <p className="muted">Five distinct sample requirements are not available to plot yet.</p>}
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Possible SDG links" note={`SELECTED TARGET · ${target.title}`} />
        {targetMappings.length ? <>
          {!targetMappings.some(mapping => mapping.status === 'source-supported') && <div className="state-box sdg-summary-empty"><strong>No source-supported mapping for this target</strong><span>Unverified examples are listed below, but are not evidence.</span></div>}
          <div className="stack">{targetMappings.map(mapping => {
          const goal = sdgGoals.find(item => item.number === mapping.goal);
          return <article className="sdg-summary-card" key={`${mapping.roleId}-${mapping.goal}`} data-testid={`card-dashboard-sdg-${mapping.roleId}-${mapping.goal}`}>
            <div className="spread"><span className="sdg-summary-number">{mapping.goal}</span><span className="tag tag-low">{mapping.status === 'source-supported' ? 'Source-supported relevance' : 'Unverified example'}</span></div>
            <strong>{goal?.name ?? `Goal ${mapping.goal}`}</strong>
            <p className="muted small">{mapping.explanation}</p>
            <div className="row">{mapping.skills.map(skill => <span key={skill} className="chip">{skill}</span>)}</div>
            {mapping.sourceUrl && mapping.sourceTitle
              ? <div className="small"><a className="text-link" href={mapping.sourceUrl} target="_blank" rel="noreferrer">{mapping.sourceTitle}</a>{mapping.sourceDate && <span className="muted"> · {mapping.sourceDate}</span>}{mapping.sourceObservation && <p className="muted small">{mapping.sourceObservation}</p>}</div>
              : <span className="muted small">No citation supplied</span>}
          </article>;
        })}</div>
        </> : <div className="state-box sdg-summary-empty"><strong>No sample mapping for this target</strong><span>We do not map every role to a goal. This is an honest empty result.</span></div>}
        <div className="disclaimer"><Info size={14} /><span>Source-supported means relevant to a cited UN target, not proof of contribution or measured impact. Other examples remain unverified.</span></div>
        <Link href="/sdgs" className="text-link">Explore all 17 goals <ArrowRight size={12} /></Link>
      </div>
    </section>
  </>;
}

export default function DashboardPage() {
  const { state } = useWorkspace();
  return state.audience === 'hr' || state.audience === 'education' ? <AggregateOverview /> : <PersonalOverview />;
}
