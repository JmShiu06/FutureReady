import { Link, useLocation } from 'wouter';
import { BookOpen, FlaskConical } from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { audienceLabels } from '@/domain/demo-data';
import { RaccoonArt } from '@/components/brand/raccoon-art';
import { PageHead } from '@/components/workspace/ui';
import { PersonalisedPathway } from '@/components/learning/personalised-pathway';

export default function LearningRoadmapPage() {
  const { state } = useWorkspace();
  const [, navigate] = useLocation();
  return <>
    <div className="page-art-head"><PageHead eyebrow={`${audienceLabels[state.audience]} · learning roadmap`} title="One practical step at a time."
      subtitle="Milestones come from the gaps of the role you chose in Careers & jobs. Completing one tracks progress only."
      action={<div className="row">
        <Link href="/learning-roadmap/skill-guidance" className="btn btn-secondary" data-testid="link-roadmap-skill-guidance"><BookOpen size={14} aria-hidden="true" /> Skill-based learning guidance</Link>
        <button type="button" className="btn btn-quiet" onClick={() => navigate('/my-profile?section=twin')} data-testid="button-roadmap-open-twin"><FlaskConical size={14} /> Digital twin & progress</button>
      </div>} /></div>
    <div data-testid="panel-profile-roadmap"><PersonalisedPathway /></div>
    <div className="pw-noprint">
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10, marginBottom: 8 }}><RaccoonArt name="reading" size={84} className="roadmap-raccoon" /></div>
    </div>
  </>;
}
