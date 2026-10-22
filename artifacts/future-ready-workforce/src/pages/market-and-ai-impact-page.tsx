import { useLocation, useSearch } from 'wouter';
import { BarChart3, Cpu } from 'lucide-react';
import { PageHead } from '@/components/workspace/ui';
import { DosmDataPanels } from '@/components/workspace/dosm-data-panels';
import { AiAnnouncementsPanel, SkillFrequencyPanel } from '@/components/workspace/radar-evidence-panels';
import { AiExplainButton } from '@/components/ai-drawer';
import { TabPanel, UrlTabs, type TabDef } from '@/components/shared/url-tabs';
import { AiImpactTab } from '@/pages/scenarios-page';

type Tab = 'market' | 'ai-impact';
const tabs: TabDef<Tab>[] = [
  { key: 'market', label: 'Labour market', icon: <BarChart3 size={14} aria-hidden="true" /> },
  { key: 'ai-impact', label: 'AI Explanation', icon: <Cpu size={14} aria-hidden="true" /> },
];

export default function MarketAndAiImpactPage() {
  const [, navigate] = useLocation();
  const param = new URLSearchParams(useSearch()).get('tab');
  const tab: Tab = param === 'ai-impact' ? 'ai-impact' : 'market';
  return <>
    <PageHead eyebrow="Labour-market and AI indicators" title="Market & AI impact"
      subtitle="Dated Malaysian labour-market indicators and a task-level look at where AI may assist. Each panel explains its source and limits; not every indicator measures AI's impact." />
    <UrlTabs tabs={tabs} active={tab} onSelect={k => navigate(`/market-and-ai-impact?tab=${k}`)} label="Market and AI impact sections" idPrefix="market" />
    <TabPanel idPrefix="market" tab={tab}>
      {tab === 'market' ? <>
        <div className="tab-intro"><p className="muted small">Latest available DOSM national observations, AI announcements and skill frequencies. Not occupation vacancies or AI causation.</p>
          <AiExplainButton request={{ feature: 'market-trends' }} label="Summarise market trends with AI" /></div>
        <DosmDataPanels />
        <div className="stack" style={{ gap: 18, marginBottom: 22, minWidth: 0 }}>
          <AiAnnouncementsPanel />
          <SkillFrequencyPanel />
        </div>
      </> : <AiImpactTab />}
    </TabPanel>
  </>;
}
