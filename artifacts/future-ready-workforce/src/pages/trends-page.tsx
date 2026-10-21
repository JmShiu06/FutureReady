import { PageHead } from "@/components/workspace/ui";
import { DosmDataPanels } from "@/components/workspace/dosm-data-panels";
import { AiAnnouncementsPanel, SkillFrequencyPanel } from "@/components/workspace/radar-evidence-panels";

export default function TrendsPage() {
  return (
    <>
      <PageHead
        eyebrow="Labour-market and AI indicators"
        title="AI & Labour Market Trends"
        subtitle="Explore dated AI developments and labour-market indicators. Each panel explains its source and limits; not every indicator directly measures AI’s impact."
      />
      <DosmDataPanels />
      <div className="stack" style={{ gap: 18, marginBottom: 22, minWidth: 0 }}>
        <AiAnnouncementsPanel />
        <SkillFrequencyPanel />
      </div>
    </>
  );
}
