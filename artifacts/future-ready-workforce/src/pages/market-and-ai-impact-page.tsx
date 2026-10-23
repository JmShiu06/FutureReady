import { useLocation, useSearch } from 'wouter';
import { BarChart3, Cpu } from 'lucide-react';
import { PageHead } from '@/components/workspace/ui';
import { DosmNationalContext } from '@/components/dosm-national-context';
import { DosmDataPanels } from '@/components/workspace/dosm-data-panels';
import { AiAnnouncementsPanel, SkillFrequencyPanel } from '@/components/workspace/radar-evidence-panels';
import { AiExplainButton } from '@/components/ai-drawer';
import { TabPanel, UrlTabs, type TabDef } from '@/components/shared/url-tabs';
import { AiImpactTab } from '@/pages/scenarios-page';
import { useI18n } from '@/i18n/i18n-context';
import { PlanningPanel } from '@/components/workspace/planning-panel';

type Tab = 'market' | 'ai-impact';
const tabDefs = (t: ReturnType<typeof useI18n>['t']): TabDef<Tab>[] => [
  { key: 'market', label: t('market.tabMarket'), icon: <BarChart3 size={14} aria-hidden="true" /> },
  { key: 'ai-impact', label: t('market.tabSkill'), icon: <Cpu size={14} aria-hidden="true" /> },
];

export default function MarketAndAiImpactPage() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const tabs = tabDefs(t);
  const param = new URLSearchParams(useSearch()).get('tab');
  const tab: Tab = param === 'ai-impact' ? 'ai-impact' : 'market';
  return <>
    <PageHead eyebrow={t('market.eyebrow')} title={t('market.title')}
      subtitle={t('market.subtitle')} />
    <UrlTabs tabs={tabs} active={tab} onSelect={k => navigate(`/market-and-ai-impact?tab=${k}`)} label={t('market.tabsLabel')} idPrefix="market" />
    <TabPanel idPrefix="market" tab={tab}>
      {tab === 'market' ? <>
        <div className="tab-intro"><p className="muted small">{t('market.intro')}</p>
          <AiExplainButton request={{ feature: 'market-trends' }} label={t('market.aiSummarise')} /></div>
        <DosmNationalContext showDefinition={false} />
        <PlanningPanel />
        <DosmDataPanels />
        <div className="stack" style={{ gap: 18, marginBottom: 22, minWidth: 0 }}>
          <AiAnnouncementsPanel />
          <SkillFrequencyPanel />
        </div>
        <div id="planning-about-slot" data-testid="planning-about-slot" />
      </> : <AiImpactTab />}
    </TabPanel>
  </>;
}
