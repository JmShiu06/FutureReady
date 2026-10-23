import { lazy, Suspense } from 'react';
import { useLocation, useSearch } from 'wouter';
import { BriefcaseBusiness, Compass, Target } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { LoadingBlock, PageHead } from '@/components/workspace/ui';
import { TabPanel, UrlTabs, type TabDef } from '@/components/shared/url-tabs';
import { useI18n } from '@/i18n/i18n-context';
import { CareerPathsTab } from '@/pages/careers-page';
import { MatchedRolesTab } from '@/pages/cv-recommendations-page';

const JobSearchPage = lazy(() => import('@/components/job-search-page'));

export type CareersTab = 'career-paths' | 'matched-roles' | 'listings';
const tabDefs = (t: ReturnType<typeof useI18n>['t']): TabDef<CareersTab>[] => [
  { key: 'career-paths', label: t('careers.tabPaths'), icon: <Compass size={14} aria-hidden="true" /> },
  { key: 'matched-roles', label: t('careers.tabMatched'), icon: <Target size={14} aria-hidden="true" /> },
  { key: 'listings', label: t('careers.tabListings'), icon: <BriefcaseBusiness size={14} aria-hidden="true" /> },
];

export default function CareersAndJobsPage() {
  const [, navigate] = useLocation();
  const { profile } = useWorkspace();
  const { t } = useI18n();
  const tabs = tabDefs(t);
  const param = new URLSearchParams(useSearch()).get('tab');
  const tab: CareersTab = tabs.some(t => t.key === param) ? param as CareersTab : 'career-paths';
  return <>
    <PageHead eyebrow={t('careers.eyebrow')} title={t('careers.title')}
      subtitle={t('careers.subtitle')} />
    <UrlTabs tabs={tabs} active={tab} onSelect={k => navigate(`/careers-and-jobs?tab=${k}`)} label={t('careers.tabsLabel')} idPrefix="careers" />
    <TabPanel idPrefix="careers" tab={tab}>
      {tab === 'career-paths' && <CareerPathsTab />}
      {tab === 'matched-roles' && <MatchedRolesTab />}
      {tab === 'listings' && <Suspense fallback={<LoadingBlock />}><JobSearchPage profileSkills={profile.skills.map(s => s.name)} /></Suspense>}
    </TabPanel>
  </>;
}
