import { Info } from 'lucide-react';
import { CvCareerExplanation } from '@/components/cv-career-explanation';

/** AI Explanation tab: the shared transient CV career explanation (replaces the old task review). */
export function AiImpactTab() {
  return <>
    <aside className="panel panel-pad ai-exposure-intro" data-testid="panel-ai-explanation-boundary">
      <Info size={17} aria-hidden="true" />
      <div>
        <strong>Analyse the skills saved in My profile.</strong>
        <p className="muted">
          Manually added skills and saved imported skills are available here. No CV upload is required. Only selected skill names
          are sent after explicit consent; no ratings or personal details are shared. Results are temporary.
        </p>
      </div>
    </aside>
    <CvCareerExplanation showUploadLink />
  </>;
}
