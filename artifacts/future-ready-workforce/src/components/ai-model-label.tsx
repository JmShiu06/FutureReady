import type { AiModelIdentity } from '@workspace/api-client-react';
import { useAiInfo } from '@/hooks/use-ai-info';
import { useI18n } from '@/i18n/i18n-context';
import { resolveModel } from '@/domain/ai-disclosure';
import { AiConsentModelView, AiModelLabelView } from '@/components/ai-model-label-view';

/** Label for AI buttons and generated outputs. Pass `output` to show the identity that actually produced a response. */
export function AiModelLabel({ output, testId, compact }: { output?: AiModelIdentity | null; testId?: string; compact?: boolean }) {
  const { t } = useI18n();
  const query = useAiInfo();
  const state = resolveModel({ output, info: query.data, isLoading: query.isLoading, isError: query.isError });
  return <AiModelLabelView state={state} t={t} onRetry={() => void query.refetch()} testId={testId} compact={compact} />;
}

/** "This will send <scope> to <provider> <model ID>." Uses current metadata; never auto-requests generation. */
export function AiConsentModel({ scope, testId }: { scope: string; testId?: string }) {
  const { t } = useI18n();
  const query = useAiInfo();
  const state = resolveModel({ info: query.data, isLoading: query.isLoading, isError: query.isError });
  return <AiConsentModelView state={state} scope={scope} t={t} testId={testId} />;
}
