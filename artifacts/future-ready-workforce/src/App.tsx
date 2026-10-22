import { lazy, Suspense } from 'react';
import { Link, Redirect, Route, Switch, useParams, useSearch } from 'wouter';
import { ArrowRight } from 'lucide-react';

import '@/components/job-search.css';
import '@/styles/workspace.css';
import '@/styles/consolidation.css';
import { WorkspaceProvider, useWorkspace } from '@/domain/workspace-context';
import { AppShell } from '@/components/workspace/app-shell';
import { LoadingBlock } from '@/components/workspace/ui';
import DashboardPage from '@/pages/dashboard-page';
const ProfilePage = lazy(() => import('@/pages/profile-page'));
const CareersAndJobsPage = lazy(() => import('@/pages/careers-and-jobs-page'));
const MarketAndAiImpactPage = lazy(() => import('@/pages/market-and-ai-impact-page'));
const LearningRoadmapPage = lazy(() => import('@/pages/learning-roadmap-page'));
const RoleDetailPage = lazy(() => import('@/pages/role-detail-page'));
const TeamPage = lazy(() => import('@/pages/team-page'));
const JobDetailsPage = lazy(() => import('@/components/job-details-page'));

function JobDetailsRoute() {
  const skills = useWorkspace().profile.skills.map(s => s.name);
  return <JobDetailsPage profileSkills={skills} />;
}

/** Old /profile, including ?section=roadmap|twin. */
function LegacyProfileRedirect() {
  const section = new URLSearchParams(useSearch()).get('section');
  if (section === 'roadmap') return <Redirect to="/learning-roadmap" replace />;
  return <Redirect to={section === 'twin' ? '/my-profile?section=twin' : '/my-profile'} replace />;
}
function LegacyDetailRedirect({ kind }: { kind: 'roles' | 'listings' }) {
  const { id = '' } = useParams<{ id: string }>();
  return <Redirect to={`/careers-and-jobs/${kind}/${encodeURIComponent(id)}`} replace />;
}

function NotFoundPage() {
  return <div className="panel panel-pad" data-testid="page-not-found"><div className="eyebrow">That page isn't here</div><h1>Let's get you back on track.</h1>
    <p className="page-subtitle">Try one of the workspaces in the sidebar.</p><Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }} data-testid="link-home">Back to dashboard <ArrowRight size={14} /></Link></div>;
}

function App() {
  return <WorkspaceProvider>
    <AppShell>
      <Suspense fallback={<LoadingBlock />}>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/my-profile" component={ProfilePage} />
        <Route path="/careers-and-jobs" component={CareersAndJobsPage} />
        <Route path="/careers-and-jobs/roles/:id" component={RoleDetailPage} />
        <Route path="/careers-and-jobs/listings/:id" component={JobDetailsRoute} />
        <Route path="/market-and-ai-impact" component={MarketAndAiImpactPage} />
        <Route path="/learning-roadmap" component={LearningRoadmapPage} />
        <Route path="/team" component={TeamPage} />

        <Route path="/"><Redirect to="/dashboard" replace /></Route>
        <Route path="/profile" component={LegacyProfileRedirect} />
        <Route path="/careers"><Redirect to="/careers-and-jobs?tab=career-paths" replace /></Route>
        <Route path="/sdgs"><Redirect to="/careers-and-jobs?tab=career-paths" replace /></Route>
        <Route path="/cv-analysis"><Redirect to="/careers-and-jobs?tab=matched-roles" replace /></Route>
        <Route path="/jobs"><Redirect to="/careers-and-jobs?tab=listings" replace /></Route>
        <Route path="/jobs/:id">{() => <LegacyDetailRedirect kind="listings" />}</Route>
        <Route path="/roles/:id">{() => <LegacyDetailRedirect kind="roles" />}</Route>
        <Route path="/trends"><Redirect to="/market-and-ai-impact?tab=market" replace /></Route>
        <Route path="/scenarios"><Redirect to="/market-and-ai-impact?tab=ai-impact" replace /></Route>
        <Route path="/roadmap"><Redirect to="/learning-roadmap" replace /></Route>
        <Route path="/twin"><Redirect to="/my-profile?section=twin" replace /></Route>
        <Route component={NotFoundPage} />
      </Switch>
      </Suspense>
    </AppShell>
  </WorkspaceProvider>;
}

export default App;
