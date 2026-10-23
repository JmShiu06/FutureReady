import { Link } from 'wouter';
import { Info, RotateCcw, Sparkles } from 'lucide-react';
import { consentSentence, modelLabelText, type ModelState } from '@/domain/ai-disclosure';
import type { MessageKey } from '@/i18n/messages';

type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Pure presentation (no data hook) so it can be rendered offline in tests. */
export function AiModelLabelView({ state, t, onRetry, testId = 'label-ai-model', compact = false }: {
  state: ModelState; t: TFn; onRetry?: () => void; testId?: string; compact?: boolean;
}) {
  const unresolved = state.kind === 'unresolved';
  return <p className={`ai-model-label${compact ? ' is-compact' : ''}${unresolved ? ' is-unresolved' : ''}`} data-testid={testId} data-model-state={state.kind}>
    <Sparkles size={11} aria-hidden="true" />
    <span data-testid={`${testId}-text`}>{modelLabelText(state, t)}</span>
    {unresolved && state.failed && onRetry && <button type="button" className="ai-model-retry" onClick={onRetry} data-testid={`${testId}-retry`}><RotateCcw size={10} aria-hidden="true" /> {t('ai.retry')}</button>}
    <Link href="/ai-disclosure" className="ai-model-link" aria-label={t('ai.linkAria')} data-testid={`${testId}-link`}>{t('ai.link')}</Link>
  </p>;
}

export function AiConsentModelView({ state, scope, t, testId = 'text-ai-consent-model' }: { state: ModelState; scope: string; t: TFn; testId?: string }) {
  return <p className="ai-consent-model" data-testid={testId}>
    <Info size={12} aria-hidden="true" />
    <span>{consentSentence(state, scope, t)}</span>
    <Link href="/ai-disclosure" className="ai-model-link" data-testid={`${testId}-link`}>{t('ai.link')}</Link>
  </p>;
}

