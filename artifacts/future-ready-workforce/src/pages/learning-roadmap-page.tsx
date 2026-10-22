import { useLocation } from 'wouter';
import { FlaskConical } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { audienceLabels } from '@/domain/demo-data';
import { RaccoonArt } from '@/components/brand/raccoon-art';
import { PageHead } from '@/components/workspace/ui';
import { RoadmapSection } from '@/components/profile/roadmap-section';
import { AiExplainButton } from '@/components/ai-drawer';
import { CvLearningGuidance } from '@/components/cv-career-explanation';

export default function LearningRoadmapPage() {
  const { state } = useWorkspace();
  const [, navigate] = useLocation();
  return <>
    <div className="page-art-head"><PageHead eyebrow={`${audienceLabels[state.audience]} · learning roadmap`} title="One practical step at a time."
      subtitle="Milestones come from the gaps of the role you chose in Careers & jobs. Completing one tracks progress only."
      action={<div className="row">
        <AiExplainButton request={{ feature: 'learning-roadmap' }} label="Explain my learning plan with AI" />
        <button type="button" className="btn btn-quiet" onClick={() => navigate('/my-profile?section=twin')} data-testid="button-roadmap-open-twin"><FlaskConical size={14} /> Digital twin & progress</button>
      </div>} /></div>
    <div className="row" style={{ justifyContent: 'flex-end', marginTop: -6, marginBottom: 8 }}><RaccoonArt name="reading" size={84} className="roadmap-raccoon" /></div>
    <CvLearningGuidance />
    <div data-testid="panel-profile-roadmap"><RoadmapSection onReview={() => navigate('/my-profile?section=twin')} /></div>
  </>;
}
