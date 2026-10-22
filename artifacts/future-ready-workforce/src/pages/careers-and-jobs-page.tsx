import { lazy, Suspense } from 'react';
import { useLocation, useSearch } from 'wouter';
import { BriefcaseBusiness, Compass, Target } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { LoadingBlock, PageHead } from '@/components/workspace/ui';
import { TabPanel, UrlTabs, type TabDef } from '@/components/shared/url-tabs';
import { CareerPathsTab } from '@/pages/careers-page';
import { MatchedRolesTab } from '@/pages/cv-recommendations-page';

const JobSearchPage = lazy(() => import('@/components/job-search-page'));

export type CareersTab = 'career-paths' | 'matched-roles' | 'listings';
const tabs: TabDef<CareersTab>[] = [
  { key: 'career-paths', label: 'Career paths', icon: <Compass size={14} aria-hidden="true" /> },
  { key: 'matched-roles', label: 'Matched roles', icon: <Target size={14} aria-hidden="true" /> },
  { key: 'listings', label: 'Listings', icon: <BriefcaseBusiness size={14} aria-hidden="true" /> },
];

export default function CareersAndJobsPage() {
  const [, navigate] = useLocation();
  const { profile } = useWorkspace();
  const param = new URLSearchParams(useSearch()).get('tab');
  const tab: CareersTab = tabs.some(t => t.key === param) ? param as CareersTab : 'career-paths';
  return <>
    <PageHead eyebrow="Careers & jobs · transparent skills evidence" title="Where your skills could travel."
      subtitle="Three views, three different metrics. Each score is labelled with what it measures; none is a hiring probability." />
    <UrlTabs tabs={tabs} active={tab} onSelect={k => navigate(`/careers-and-jobs?tab=${k}`)} label="Careers and jobs views" idPrefix="careers" />
    <TabPanel idPrefix="careers" tab={tab}>
      {tab === 'career-paths' && <CareerPathsTab />}
      {tab === 'matched-roles' && <MatchedRolesTab />}
      {tab === 'listings' && <Suspense fallback={<LoadingBlock />}><JobSearchPage profileSkills={profile.skills.map(s => s.name)} /></Suspense>}
    </TabPanel>
  </>;
}
