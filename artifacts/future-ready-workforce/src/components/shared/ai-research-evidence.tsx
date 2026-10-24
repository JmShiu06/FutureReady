import { researchLabel } from '@workspace/workforce-evidence';
import { useAiResearch } from '@/hooks/use-ai-research';
import { useI18n } from '@/i18n/i18n-context';
export function AiResearchEvidence({ controls = false }: { controls?: boolean }) {
  const { t, ui } = useI18n();
  const ai = useAiResearch();
  const snapshot = ai.data?.snapshot;
  return <div className="small" data-testid="ai-research-evidence">
    <p><b>{ui(researchLabel)}</b></p>
    {controls && <button className="btn btn-secondary btn-small" disabled={ai.busy} onClick={ai.refresh}> {t(ai.busy ? 'learn.aiFetching' : 'learn.aiRefresh')}</button>}
    <p role="status">{snapshot ? t('learn.aiUpdated', { date: snapshot.fetchedAt }) : t('learn.aiNotFetched')}</p>
    {(ai.data?.error || ai.isError || ai.refreshError) && <p role="alert">{ai.data?.error ?? t('learn.aiUnavailable')}</p>}
    {snapshot && <details><summary>{t('learn.aiEvidence')}</summary>
      <p className="small muted">{t('detail.sourceLanguage')}</p>
      <p>{t('learn.aiWindow', { start: snapshot.currentStart.slice(0, 10), end: snapshot.end.slice(0, 10), previous: snapshot.previousStart.slice(0, 10) })}</p>
      <div style={{ overflowWrap: 'anywhere' }}>{snapshot.counts.map(c => <details key={c.capability}><summary>{t('learn.aiPapers', { label: c.label, previous: c.previous, current: c.current })}</summary>
        <p>{t('learn.aiGrowth', { growth: c.growth === null ? t('learn.aiZero') : `${(100 * c.growth).toFixed(1)}%` })} <code>{c.query}</code></p>
        <a href={c.previousQueryUrl} target="_blank" rel="noreferrer">{t('learn.aiPrevious')}</a> · <a href={c.currentQueryUrl} target="_blank" rel="noreferrer">{t('learn.aiRecent')}</a>
      </details>)}</div>
      <p>{t('learn.aiCalculation')}</p>
    </details>}
  </div>;
}
