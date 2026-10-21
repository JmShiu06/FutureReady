import { lazy, Suspense } from 'react';
import { Link, Redirect, Route, Switch } from 'wouter';
import { ArrowRight } from 'lucide-react';

import '@/components/job-search.css';
import '@/styles/workspace.css';
import { WorkspaceProvider, useWorkspace } from '@/domain/workspace-context';
import { AppShell } from '@/components/workspace/app-shell';
import { LoadingBlock } from '@/components/workspace/ui';
import DashboardPage from '@/pages/dashboard-page';
const ProfilePage = lazy(() => import('@/pages/profile-page'));
const CareersPage = lazy(() => import('@/pages/careers-page'));
const CvRecommendationsPage = lazy(() => import('@/pages/cv-recommendations-page'));
const RoleDetailPage = lazy(() => import('@/pages/role-detail-page'));
const TrendsPage = lazy(() => import('@/pages/trends-page'));
const SdgsPage = lazy(() => import('@/pages/sdgs-page'));
const ScenariosPage = lazy(() => import('@/pages/scenarios-page'));
const TeamPage = lazy(() => import('@/pages/team-page'));

const JobSearchPage = lazy(() => import('@/components/job-search-page'));
const JobDetailsPage = lazy(() => import('@/components/job-details-page'));

function useProfileSkillNames() {
  return useWorkspace().profile.skills.map(s => s.name);
}
function JobsRoute() {
  const skills = useProfileSkillNames();
  return <Suspense fallback={<LoadingBlock />}><JobSearchPage profileSkills={skills} /></Suspense>;
}
function JobDetailsRoute() {
  const skills = useProfileSkillNames();
  return <Suspense fallback={<LoadingBlock />}><JobDetailsPage profileSkills={skills} /></Suspense>;
}
function NotFoundPage() {
  return <div className="panel panel-pad" data-testid="page-not-found"><div className="eyebrow">That page isn't here</div><h1>Let's get you back on track.</h1>
    <p className="page-subtitle">Try one of the workspaces in the sidebar.</p><Link href="/" className="btn btn-primary" style={{ marginTop: 16 }} data-testid="link-home">Back to overview <ArrowRight size={14} /></Link></div>;
}

function App() {
  return <WorkspaceProvider>
    <AppShell>
      <Suspense fallback={<LoadingBlock />}>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/careers" component={CareersPage} />
        <Route path="/cv-analysis" component={CvRecommendationsPage} />
        <Route path="/roles/:id" component={RoleDetailPage} />
        <Route path="/trends" component={TrendsPage} />
        <Route path="/twin"><Redirect to="/profile?section=twin" /></Route>
        <Route path="/roadmap"><Redirect to="/profile?section=roadmap" /></Route>
        <Route path="/sdgs" component={SdgsPage} />
        <Route path="/scenarios" component={ScenariosPage} />
        <Route path="/team" component={TeamPage} />
        <Route path="/jobs" component={JobsRoute} />
        <Route path="/jobs/:id" component={JobDetailsRoute} />
        <Route component={NotFoundPage} />
      </Switch>
      </Suspense>
    </AppShell>
  </WorkspaceProvider>;
}

export default App;
