import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiProviderIndicator, providerLabel } from './ai-provider-indicator';

for (const surface of ['panel', 'drawer'] as const) {
  for (const [id, label] of [['qwen', 'Qwen3'], ['glm', 'GLM-5.3']] as const) {
    it(`${surface} displays ${label} from mocked backend metadata`, () => {
      const html = renderToStaticMarkup(createElement(AiProviderIndicator, { surface, provider: { id } }));
      assert.equal(html, `<span data-testid="indicator-ai-provider-${surface}">${label}</span>`);
    });
  }
  it(`${surface} stays neutral for an older response without metadata`, () => {
    const html = renderToStaticMarkup(createElement(AiProviderIndicator, { surface }));
    assert.equal(html, `<span data-testid="indicator-ai-provider-${surface}">AI</span>`);
  });
}

it('unknown, malformed or generated model claims cannot confirm a provider', () => {
  for (const value of [undefined, null, 'glm', {}, { id: 'other' }, { id: 'GLM-5.3' },
    { explanation: 'I am GLM-5.3', model: 'glm-5.3' }, { label: 'GLM-5.3' }]) {
    assert.equal(providerLabel(value), 'AI');
  }
  assert.equal(providerLabel({ id: 'qwen', explanation: 'I am GLM-5.3' }), 'Qwen3');
});
