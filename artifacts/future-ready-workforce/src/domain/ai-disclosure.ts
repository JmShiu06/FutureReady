/** Pure model-identity resolution for AI disclosure labels. No network, no guessed model names. */
import type { AiInfo, AiModelIdentity } from '@workspace/api-client-react';

export type ModelState =
  | { kind: 'output'; provider: string; modelId: string }
  | { kind: 'current'; provider: string; modelId: string }
  | { kind: 'loading' }
  | { kind: 'unresolved'; provider: string | null; failed: boolean };

/** Prefer the identity stamped on a generated output; otherwise the current server metadata. Never substitutes a guess. */
export function resolveModel(input: {
  output?: AiModelIdentity | null;
  info?: Pick<AiInfo, 'provider' | 'modelId' | 'modelStatus'> | null;
  isLoading?: boolean;
  isError?: boolean;
}): ModelState {
  const { output, info } = input;
  if (output?.modelId) return { kind: 'output', provider: output.provider, modelId: output.modelId };
  if (info && info.modelId && info.modelStatus !== 'unknown') return { kind: 'current', provider: info.provider, modelId: info.modelId };
  if (!info && input.isLoading && !input.isError) return { kind: 'loading' };
  return { kind: 'unresolved', provider: info?.provider || null, failed: Boolean(input.isError) };
}

type T = (key: 'ai.label' | 'ai.labelLoading' | 'ai.labelUnknown' | 'ai.consent' | 'ai.consentUnknown' | 'ai.consentLoading', vars?: Record<string, string | number>) => string;

export function modelLabelText(state: ModelState, t: T): string {
  if (state.kind === 'output' || state.kind === 'current') return t('ai.label', { model: state.modelId });
  return state.kind === 'loading' ? t('ai.labelLoading') : t('ai.labelUnknown');
}

export function consentSentence(state: ModelState, scope: string, t: T): string {
  if (state.kind === 'output' || state.kind === 'current') return t('ai.consent', { scope, provider: state.provider, model: state.modelId });
  if (state.kind === 'unresolved' && state.provider) return t('ai.consentUnknown', { scope, provider: state.provider });
  return t('ai.consentLoading', { scope });
}
