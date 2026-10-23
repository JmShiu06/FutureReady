import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { PageHead } from '@/components/workspace/ui';
import { CvLearningGuidance } from '@/components/cv-career-explanation';

/** Reuses the transient saved-skill result; opening this route never starts AI. */
export default function SkillLearningGuidancePage() {
  return <>
    <PageHead eyebrow="Learning roadmap · skill guidance" title="Skill-based learning guidance"
      subtitle="Review learning suggestions from your selected saved skills. Your roadmap and progress stay unchanged."
      action={<Link href="/learning-roadmap" className="btn btn-secondary" data-testid="link-guidance-back-roadmap"><ArrowLeft size={14} aria-hidden="true" /> Back to Learning roadmap</Link>} />
    <CvLearningGuidance />
  </>;
}
