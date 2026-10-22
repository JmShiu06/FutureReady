import { Info } from 'lucide-react';
import { CvCareerExplanation } from '@/components/cv-career-explanation';

/** AI Explanation tab: the shared transient CV career explanation (replaces the old task review). */
export function AiImpactTab() {
  return <>
    <aside className="panel panel-pad ai-exposure-intro" data-testid="panel-ai-explanation-boundary">
      <Info size={17} aria-hidden="true" />
      <div>
        <strong>Explanations come only from your confirmed CV details.</strong>
        <p className="muted">
          This view shares the CV you uploaded in My profile during this session. Nothing is sent to AI until you
          review the details and give consent, and nothing is saved. A new upload or audience switch clears it.
        </p>
      </div>
    </aside>
    <CvCareerExplanation showUploadLink />
  </>;
}
