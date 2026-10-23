import { Info } from 'lucide-react';
import { CvCareerExplanation } from '@/components/cv-career-explanation';
import { useI18n } from '@/i18n/i18n-context';

/** AI Explanation tab: the shared transient CV career explanation (replaces the old task review). */
export function AiImpactTab() {
  const { t } = useI18n();
  return <>
    <aside className="panel panel-pad ai-exposure-intro" data-testid="panel-ai-explanation-boundary">
      <Info size={17} aria-hidden="true" />
      <div>
        <strong>{t('sa.boundaryTitle')}</strong>
        <p className="muted">
          {t('sa.boundaryBody')}
        </p>
      </div>
    </aside>
    <CvCareerExplanation showUploadLink />
  </>;
}
