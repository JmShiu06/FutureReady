import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BarChart3, BriefcaseBusiness, Compass, Route as RouteIcon, UserRound, Users } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { useI18n } from '@/i18n/i18n-context';
import { aggregateRecords, audienceLabels, demoRoles } from '@/domain/demo-data';
import { assessRole, completionKey, rankCareers } from '@/domain/services';
import { activeBaseline, roadmapMilestones } from '@/domain/learning';
import { RaccoonArt } from '@/components/brand/raccoon-art';
import { PageHead } from '@/components/workspace/ui';
import { MatchScore } from '@/components/shared/match-score';
import { documentedOverlap, officialBaseline } from '@/domain/official-roadmap';
import { usePathwayProgress } from '@/hooks/use-pathway-progress';

function SummaryCard({ icon, eyebrow, title, value, foot, href, cta, testId }: {
  icon: React.ReactNode; eyebrow: string; title: string; value?: React.ReactNode; foot?: React.ReactNode; href: string; cta: string; testId: string;
}) {
  return <article className="panel summary-card" data-testid={`card-summary-${testId}`}>
    <div className="summary-top"><span className="summary-icon">{icon}</span><span className="eyebrow">{eyebrow}</span></div>
    <h2>{title}</h2>
    {value !== undefined && <div className="summary-value">{value}</div>}
    {foot && <div className="summary-foot">{foot}</div>}
    <Link href={href} className="text-link summary-link" data-testid={`link-summary-${testId}`}>{cta} <ArrowRight size={12} /></Link>
  </article>;
}

function AggregateOverview() {
  const { state } = useWorkspace();
  const isHr = state.audience === 'hr';
  const stats = useMemo(() => {
    const assessed = aggregateRecords.map(r => assessRole(r, demoRoles.find(d => d.id === r.targetRoleId)!));
    const avg = Math.round(assessed.reduce((t, a) => t + a.readiness, 0) / assessed.length);
    const counts = new Map<string, number>();
    assessed.forEach(a => a.gaps.forEach(g => counts.set(g.name, (counts.get(g.name) ?? 0) + 1)));
    const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const groups = new Set(aggregateRecords.map(r => isHr ? r.group : r.programme)).size;
    return { avg, top, groups };
  }, [isHr]);
  return <>
    <PageHead eyebrow={`${audienceLabels[state.audience]} · dashboard`} title={isHr ? 'Plan team reskilling from aggregate patterns.' : 'See where your cohorts need support.'}
      subtitle="Summaries from 12 synthetic records. Nothing here ranks or decides about an individual." />
    <section className="summary-grid summary-grid-lead">
      <article className="welcome-card" data-testid="card-summary-team">
        <div className="eyebrow">{isHr ? 'Team planning' : 'Cohort planning'}</div>
        <h1>{aggregateRecords.length} synthetic records across {stats.groups} {isHr ? 'departments' : 'programmes'}</h1>
        <p>Aggregates support learning investment and curriculum conversations. They are not for hiring, ranking or performance decisions about named people.</p>
        <RaccoonArt name="waving" size={118} className="welcome-raccoon" />
        <div className="welcome-actions"><Link href="/team" className="btn btn-primary" data-testid="link-dashboard-team"><Users size={14} /> Open {isHr ? 'team' : 'cohort'} planning <ArrowRight size={14} /></Link></div>
      </article>
      <SummaryCard icon={<Compass size={15} />} eyebrow="Average coverage" title="Toward each record's target role" testId="avg"
        value={<span data-testid="stat-avg-coverage">{stats.avg}%</span>} foot="Illustrative proficiency coverage, not job probability" href="/team" cta="See distribution" />
    </section>
    <section className="summary-grid">
      <SummaryCard icon={<RouteIcon size={15} />} eyebrow="Most common gap" title={stats.top ? stats.top[0] : 'No gaps recorded'} testId="gap"
        value={stats.top ? `${stats.top[1]} of ${aggregateRecords.length}` : undefined} foot="records below the target level" href="/team" cta="All skill gaps" />
      <SummaryCard icon={<BarChart3 size={15} />} eyebrow="Market & AI impact" title="Labour-market context and task-level AI support" testId="market"
        href="/market-and-ai-impact?tab=ai-impact" cta="Review AI task exposure" />
      <SummaryCard icon={<BriefcaseBusiness size={15} />} eyebrow="Careers & jobs" title="Career paths with SDG relevance tags" testId="careers"
        href="/careers-and-jobs?tab=career-paths" cta="Explore career paths" />
    </section>
  </>;
}

function PersonalOverview() {
  const { state, profile, targetRoleId } = useWorkspace();
  const { t } = useI18n();
  const ranked = useMemo(() => rankCareers(profile), [profile]);
  const target = demoRoles.find(r => r.id === targetRoleId) ?? demoRoles[0];
  const occupation = officialBaseline(state)?.occupation;
  const overlap = occupation ? documentedOverlap(profile.skills, occupation) : null;
  const targetAssessment = useMemo(() => assessRole(profile, target), [profile, target]);
  const pathway = usePathwayProgress();
  const built = !!activeBaseline(state);
  const top = ranked[0];
  const graduate = state.audience === 'graduate';
  const audienceDetails = graduate
    ? [profile.qualification, profile.studyField].filter(Boolean).join(' · ')
    : profile.experienceYears === null ? '' : `${profile.experienceYears} years of experience`;
  const profileContext = [audienceDetails, profile.location, profile.workPreference,
    profile.learningHours === null ? '' : `${profile.learningHours} learning hrs/week`,
    profile.budgetMYR === null ? '' : `budget MYR ${profile.budgetMYR}`].filter(Boolean).join(' · ');
  return <>
    <PageHead eyebrow={`${audienceLabels[state.audience]} · dashboard`} title={graduate ? 'Turn your studies into a first career move.' : 'Make your next move with a little more clarity.'}
      subtitle="A summary of where you stand. Each card opens the full view." />
    <section className="summary-grid summary-grid-lead">
      <article className="welcome-card">
        <div className="eyebrow">{t('dash.startingFrom')}</div>
        <h1 data-testid="text-dashboard-occupation">{profile.occupation || t('dash.yourProfile')}</h1>
        <p>{profileContext || t('dash.addSkillsHint')}</p>
        <RaccoonArt name="waving" size={118} className="welcome-raccoon" />
        <div className="welcome-actions">
          <Link href="/careers-and-jobs?tab=career-paths" className="btn btn-primary" data-testid="link-explore-careers"><Compass size={14} /> {t('dash.exploreCareers')} <ArrowRight size={14} /></Link>
          <Link href="/my-profile" className="btn btn-quiet" data-testid="link-edit-profile"><UserRound size={14} /> {t('dash.editProfile')}</Link>
        </div>
      </article>
      <SummaryCard icon={<RouteIcon size={15} />} eyebrow={t('dash.currentTarget')} title={occupation?.title ?? t('dash.noTarget')} testId="target"
        value={overlap ? <MatchScore metric="onet" value={overlap.score} matched={overlap.matched} considered={overlap.total} variant="pill" testId="stat-target-overlap" />
          : undefined}
        foot={overlap ? `${overlap.total - overlap.matched} documented skills not in profile` : t('dash.chooseOccupation')} href={occupation ? `/careers-and-jobs/roles/${occupation.id}` : '/careers-and-jobs?tab=career-paths'} cta={occupation ? t('dash.roleDetail') : t('dash.chooseTarget')} />
    </section>
    <section className="summary-grid">
      <SummaryCard icon={<UserRound size={15} />} eyebrow={t('nav.profile')} title={t('dash.skillsSaved', { count: profile.skills.length })} testId="profile"
        foot={t('dash.profileFoot')} href="/my-profile" cta={t('dash.openProfile')} />
      <SummaryCard icon={<BriefcaseBusiness size={15} />} eyebrow={t('nav.careers')} title={profile.skills.length ? t('dash.exploreMatches') : t('dash.noMatches')} testId="careers"
        foot={t('dash.careersFoot')} href="/careers-and-jobs?tab=matched-roles" cta={t('dash.viewMatched')} />
      <SummaryCard icon={<RouteIcon size={15} />} eyebrow={t('nav.roadmap')} title={built ? t('dash.stepsDone', { done: pathway.done, total: pathway.total, percent: pathway.percent }) : t('dash.noRoadmap')} testId="roadmap"
        foot={built ? t('dash.roadmapFootBuilt') : t('dash.roadmapFootEmpty')} href="/learning-roadmap" cta={t('dash.openRoadmap')} />
      <SummaryCard icon={<BarChart3 size={15} />} eyebrow={t('nav.market')} title={t('dash.marketTitle')} testId="market"
        foot={t('dash.marketFoot')} href="/market-and-ai-impact" cta={t('dash.openMarket')} />
    </section>
  </>;
}

export default function DashboardPage() {
  const { state } = useWorkspace();
  return state.audience === 'hr' || state.audience === 'education' ? <AggregateOverview /> : <PersonalOverview />;
}
