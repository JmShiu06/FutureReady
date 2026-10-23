import { Cpu, Database, ShieldCheck, Sigma } from 'lucide-react';
import type { AiInfo } from '@workspace/api-client-react';
import type { MessageKey } from '@/i18n/messages';

type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

function List({ items, t, testId }: { items: string[]; t: TFn; testId: string }) {
  if (!items.length) return <p className="muted small">{t('ai.page.empty')}</p>;
  return <ul className="aid-list" data-testid={testId}>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
}

/** Pure body, renderable offline. */
export function AiDisclosureContent({ info, t }: { info: AiInfo; t: TFn }) {
  const known = Boolean(info.modelId) && info.modelStatus !== 'unknown';
  return <>
    <dl className="aid-model" data-testid="panel-ai-model">
      <div><dt>{t('ai.page.provider')}</dt><dd data-testid="text-ai-provider">{info.provider || t('ai.page.unknownModel')}</dd></div>
      <div><dt>{t('ai.page.modelId')}</dt><dd className={known ? 'mono' : 'unknown'} data-testid="text-ai-model-id">{known ? info.modelId : t('ai.page.unknownModel')}</dd></div>
      <div><dt>{t('ai.page.status')}</dt><dd data-testid="text-ai-model-status">{t(`ai.page.status.${info.modelStatus}`)}</dd></div>
    </dl>
  </>;
}

export function AiDisclosureSections({ info, t }: { info: AiInfo; t: TFn }) {
  return <div className="aid-grid">
    <section className="panel panel-pad aid-section" aria-labelledby="aid-features">
      <h2 id="aid-features"><Cpu size={15} aria-hidden="true" /> {t('ai.page.features')}</h2>
      <p className="aid-notice">{t('ai.page.sourceNotice')}</p>
      <div className="aid-features">{info.features.map(f => <article className="aid-feature" key={f.id} data-testid={`card-ai-feature-${f.id}`}>
        <header><h3>{f.title}</h3><span className={`aid-pill ${f.usesLanguageModel ? 'llm' : 'none'}`}>{f.usesLanguageModel ? t('ai.page.llmYes') : t('ai.page.llmNo')}</span></header>
        <p>{f.description}</p>
        <small><strong>{t(`ai.page.usage.${f.usage}`)}</strong> · {t('ai.page.inputScope')}: {f.inputScope}</small>
      </article>)}</div>
    </section>
    <div className="aid-stack">
      <section className="panel panel-pad aid-section" aria-labelledby="aid-not"><h2 id="aid-not"><Sigma size={15} aria-hidden="true" /> {t('ai.page.notAi')}</h2><List items={info.nonAiUses} t={t} testId="list-ai-non-uses" /></section>
      <section className="panel panel-pad aid-section" aria-labelledby="aid-guard"><h2 id="aid-guard"><ShieldCheck size={15} aria-hidden="true" /> {t('ai.page.guardrails')}</h2><List items={info.guardrails} t={t} testId="list-ai-guardrails" /></section>
      <section className="panel panel-pad aid-section" aria-labelledby="aid-data"><h2 id="aid-data"><Database size={15} aria-hidden="true" /> {t('ai.page.data')}</h2><List items={info.dataPractices} t={t} testId="list-ai-data-practices" /></section>
    </div>
  </div>;
}

