import { it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup as rawRender } from 'react-dom/server';
import type { ReactElement } from 'react';
import { Router } from 'wouter';
import type { AiInfo } from '@workspace/api-client-react';
import { resolveModel, modelLabelText, consentSentence } from './ai-disclosure';
import { AiModelLabelView, AiConsentModelView } from '../components/ai-model-label-view';
import { AiDisclosureContent, AiDisclosureSections } from '../components/ai-disclosure-view';
import { LOCALES, interpolate } from '../i18n/locales';
import { catalogs, translate, type MessageKey } from '../i18n/messages';
import { enAi } from '../i18n/messages-ai';

const renderToStaticMarkup = (el: ReactElement) => rawRender(<Router ssrPath="/">{el}</Router>);
const t = (key: MessageKey, vars?: Record<string, string | number>) => interpolate(translate('en', key), vars);
const info = (over: Partial<AiInfo> = {}): AiInfo => ({
  provider: 'TestProvider', modelId: 'test/model-x', modelStatus: 'configured',
  features: ['career-explorer', 'cv-analysis', 'learning-roadmap', 'digital-twin', 'task-exposure', 'market-trends', 'job-fit', 'sdg-contribution', 'profile-skills', 'skill-analysis', 'skill-learning-guidance', 'cv-extraction']
    .map(id => ({ id, title: id, description: `d-${id}`, usesLanguageModel: id !== 'cv-extraction', usage: id === 'cv-extraction' ? 'local' as const : id === 'skill-learning-guidance' ? 'reused-output' as const : 'generation' as const, inputScope: 's' })),
  nonAiUses: ['Match scores'], guardrails: ['Cite sources'], dataPractices: ['Confirmed skills are stored in this browser'], ...over,
});

it('uses the exact English label wording with the resolved model id', () => {
  const s = resolveModel({ info: info() });
  assert.equal(modelLabelText(s, t), 'AI-generated · test/model-x · may contain mistakes · check the cited sources');
});

it('prefers the identity stamped on a generated output over current metadata', () => {
  const s = resolveModel({ output: { provider: 'Old', modelId: 'old/model' }, info: info() });
  assert.deepEqual(s, { kind: 'output', provider: 'Old', modelId: 'old/model' });
});

it('never guesses a model when metadata is loading, unknown or failed', () => {
  assert.equal(resolveModel({ isLoading: true }).kind, 'loading');
  const unknown = resolveModel({ info: info({ modelId: null, modelStatus: 'unknown' }) });
  assert.equal(unknown.kind, 'unresolved');
  assert.ok(!modelLabelText(unknown, t).includes('test/model-x'));
  const failed = resolveModel({ isError: true });
  assert.deepEqual(failed, { kind: 'unresolved', provider: null, failed: true });
  const html = renderToStaticMarkup(<AiModelLabelView state={failed} t={t} onRetry={() => {}} />);
  assert.match(html, /model ID not resolved/);
  assert.match(html, /label-ai-model-retry/);
  assert.match(html, /href="\/ai-disclosure"/);
});

it('consent sentence names provider and model, or says it is unresolved', () => {
  assert.equal(consentSentence(resolveModel({ info: info() }), 'the 3 selected saved skill names', t), 'This will send the 3 selected saved skill names to TestProvider test/model-x.');
  assert.match(consentSentence(resolveModel({ info: info({ modelId: null, modelStatus: 'unknown' }) }), 'x', t), /could not be resolved/);
  const html = renderToStaticMarkup(<AiConsentModelView state={resolveModel({ info: info() })} scope="x" t={t} />);
  assert.match(html, /TestProvider test\/model-x/);
});

it('every AI surface label renders the model id and a disclosure link', () => {
  const surfaces = ['drawer', 'button-cv-analysis', 'button-market-trends', 'result-cv-analysis', 'result-market-trends', 'cvx-button', 'cvx-result', 'cvx-learning', 'cv-skill-explain'];
  for (const id of surfaces) {
    const html = renderToStaticMarkup(<AiModelLabelView state={resolveModel({ info: info() })} t={t} testId={`label-ai-model-${id}`} />);
    assert.match(html, new RegExp(`data-testid="label-ai-model-${id}"`));
    assert.match(html, /test\/model-x/);
    assert.match(html, /href="\/ai-disclosure"/);
  }
});

it('disclosure page renders full inventory, non-AI uses, guardrails and data practices; unknown model is explicit', () => {
  const html = renderToStaticMarkup(<><AiDisclosureContent info={info()} t={t} /><AiDisclosureSections info={info()} t={t} /></>);
  for (const id of ['cv-extraction', 'skill-learning-guidance', 'job-fit', 'skill-analysis']) assert.match(html, new RegExp(`card-ai-feature-${id}`));
  assert.match(html, /No language model/);
  assert.match(html, /Confirmed skills are stored in this browser/);
  const unknown = renderToStaticMarkup(<AiDisclosureContent info={info({ modelId: null, modelStatus: 'unknown' })} t={t} />);
  assert.match(unknown, /Unknown — not resolved/);
});

it('all eight locales provide every AI disclosure key', () => {
  for (const l of LOCALES) for (const k of Object.keys(enAi) as MessageKey[]) assert.ok(catalogs[l][k], `${l} ${k}`);
});
