import { createElement } from 'react';
import type { AiProviderMetadata } from '@workspace/api-client-react';

/** Identity comes only from the successful response's server-owned metadata. */
export function providerLabel(provider: unknown): string {
  if (!provider || typeof provider !== 'object' || !('id' in provider)) return 'AI';
  if (provider.id === 'qwen') return 'Qwen3';
  if (provider.id === 'glm') return 'GLM-5.3';
  return 'AI';
}

export function AiProviderIndicator({ provider, surface }: {
  provider?: AiProviderMetadata;
  surface: 'panel' | 'drawer';
}) {
  return createElement('span', { 'data-testid': `indicator-ai-provider-${surface}` }, providerLabel(provider));
}
