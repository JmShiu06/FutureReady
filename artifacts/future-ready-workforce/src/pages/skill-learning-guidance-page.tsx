import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { PageHead } from '@/components/workspace/ui';
import { useI18n } from '@/i18n/i18n-context';
import { CvLearningGuidance } from '@/components/cv-career-explanation';

/** Reuses the transient saved-skill result; opening this route never starts AI. */
export default function SkillLearningGuidancePage() {
  const { t } = useI18n();
  return <>
    <PageHead eyebrow={t('guidance.eyebrow')} title={t('guidance.title')}
      subtitle={t('guidance.subtitle')}
      action={<Link href="/learning-roadmap" className="btn btn-secondary" data-testid="link-guidance-back-roadmap"><ArrowLeft size={14} aria-hidden="true" /> {t('guidance.back')}</Link>} />
    <CvLearningGuidance />
  </>;
}
