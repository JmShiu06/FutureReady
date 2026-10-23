import { Link } from 'wouter';
import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { useAiInfo } from '@/hooks/use-ai-info';
import { useI18n } from '@/i18n/i18n-context';
import { AiDisclosureContent, AiDisclosureSections } from '@/components/ai-disclosure-view';

export default function AiDisclosurePage() {
  const { t } = useI18n();
  const query = useAiInfo();
  const info = query.data;
  return <div data-testid="page-ai-disclosure">
    <section className="aid-hero">
      <div className="eyebrow">{t('ai.page.eyebrow')}</div>
      <h1>{t('ai.page.title')}</h1>
      <p>{t('ai.page.subtitle')}</p>
      {info ? <AiDisclosureContent info={info} t={t} />
        : query.isError ? null
        : <div className="aid-skeleton" role="status" aria-label={t('common.loading')}><i style={{ width: '62%' }} /><i style={{ width: '44%' }} /></div>}
    </section>
    {query.isError && !info && <div className="panel panel-pad" role="alert" data-testid="error-ai-info">
      <h2><AlertTriangle size={15} aria-hidden="true" /> {t('ai.page.errorTitle')}</h2>
      <p className="page-subtitle" style={{ margin: '8px 0 12px' }}>{t('ai.page.errorBody')}</p>
      <p className="muted small" data-testid="text-ai-model-id">{t('ai.page.unknownModel')}</p>
      <button type="button" className="btn btn-secondary btn-small" onClick={() => void query.refetch()} data-testid="button-ai-info-retry"><RotateCcw size={12} aria-hidden="true" /> {t('common.retry')}</button>
    </div>}
    {info && <AiDisclosureSections info={info} t={t} />}
    <Link href="/dashboard" className="text-link" style={{ display: 'inline-flex', gap: 6, marginTop: 16 }} data-testid="link-ai-disclosure-back">{t('ai.page.back')} <ArrowRight size={13} /></Link>
  </div>;
}
