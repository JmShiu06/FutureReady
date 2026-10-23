import { useId } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, BookOpen, Check, ChevronDown, ExternalLink, Lightbulb, Lock, RotateCcw, Sparkles, Target, Trash2, TrendingUp, X } from 'lucide-react';
import { useSkillAnalysis } from '@/domain/skill-analysis-session';
import { RaccoonLoader } from '@/components/workspace/raccoon-loader';
import { MatchScore } from '@/components/shared/match-score';
import { cvExplanationSectionInView, type CvExplanationView } from '@/domain/cv-explanation-sections';
import './cv-career-explanation.css';
import { useI18n } from '@/i18n/i18n-context';
import { AiConsentModel, AiModelLabel } from '@/components/ai-model-label';

export const NO_SKILLS_MESSAGE = 'No skills detected from CV.';
export const LIMITED_MESSAGE = 'Some information may be incomplete due to CV extraction limitations.';

const sectionDefs = [
  { key: 'skillAnalysis', icon: Sparkles },
  { key: 'careerMatchAnalysis', icon: Target },
  { key: 'skillGapAnalysis', icon: AlertTriangle },
  { key: 'improvementSuggestions', icon: TrendingUp },
  { key: 'strengths', icon: Check },
  { key: 'areasForGrowth', icon: Lightbulb },
] as const;

function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n{1,}/).map(t => t.trim()).filter(Boolean).map((t, i) => <p key={i}>{t}</p>)}</>;
}

/** Review saved skill names only; never reads the CV session. */
function CvPreview() {
  const { names, selected, toggleSkill, consent, setConsent, requestExplanation, explainPhase, clear } = useSkillAnalysis();
  const id = useId();
  const { t } = useI18n();
  const sendable = selected.length > 0;
  return <section className="cvx-preview" aria-labelledby="cvx-preview-title" data-testid="panel-cvx-preview">
    <div className="cvx-preview-head">
      <div>
        <h3 id="cvx-preview-title">{t('sa.reviewTitle')}</h3>
        <p><Lock size={12} aria-hidden="true" /> {t('sa.reviewBody')}</p>
      </div>
      <button type="button" className="btn btn-secondary btn-small" onClick={clear} data-testid="button-cvx-discard"><Trash2 size={12} aria-hidden="true" /> {t('sa.clear')}</button>
    </div>
    <details className="cvx-field" data-testid="details-cvx-sharing-names" open>
      <summary>{t('sa.choose', { count: selected.length })}</summary>
      <div className="cvx-skill-grid">{names.map((name, index) => <div className={`cvx-item${selected.includes(name) ? '' : ' is-off'}`} key={name}>
        <input id={`${id}-${index}`} type="checkbox" checked={selected.includes(name)} onChange={() => toggleSkill(name)} aria-label={t('sa.include', { name })} />
        <label htmlFor={`${id}-${index}`} className="cvx-skill-label">{name}</label>
      </div>)}</div>
    </details>
    {names.length > 50 && <p className="cvx-empty">{t('sa.max')}</p>}

    <div className="cvx-consent">
      <label>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={!sendable || explainPhase === 'loading'} data-testid="checkbox-cvx-consent" />
        <span>{t('sa.consent')}</span>
      </label>
      <AiConsentModel scope={t('ai.scope.savedSkills', { count: selected.length })} testId="text-cvx-consent-model" />
      <button type="button" className="btn btn-primary" disabled={!consent || !sendable || explainPhase === 'loading'} onClick={requestExplanation} data-testid="button-cvx-generate">
        {explainPhase === 'loading' ? <RaccoonLoader size="small" /> : <Sparkles size={14} aria-hidden="true" />}
        {explainPhase === 'loading' ? t('sa.analysing') : t('sa.analyse')}
      </button>
      <AiModelLabel compact testId="label-ai-model-cvx-button" />
      {!sendable && <p className="cvx-empty">{t('sa.selectOne')}</p>}
    </div>
  </section>;
}

function ExplanationResult({ view = 'career' }: { view?: CvExplanationView }) {
  const { explanation, explainPhase, explainError, requestExplanation, consent } = useSkillAnalysis();
  const { t } = useI18n();
  if (explainPhase === 'loading') return <div className="cvx-skeleton" role="status" aria-live="polite" data-testid="status-cvx-loading">
    <span className="sr-only">{t('sa.loadingSr')}</span>
    <RaccoonLoader />
    {Array.from({ length: 4 }, (_, i) => <i key={i} style={{ width: `${92 - i * 14}%` }} />)}
  </div>;
  if (explainPhase === 'error') return <div className="cvx-error" role="alert" data-testid="error-cvx">
    <p>{explainError}</p>
    <button type="button" className="btn btn-secondary btn-small" onClick={requestExplanation} disabled={!consent} data-testid="button-cvx-retry"><RotateCcw size={12} aria-hidden="true" /> {t('common.tryAgain')}</button>
  </div>;
  if (!explanation) return null;
  const { sections, matches, resources, warnings } = explanation;
  const titleId = view === 'learning' ? 'cvx-learning-result-title' : 'cvx-result-title';
  return <section className="cvx-result" aria-labelledby={titleId} data-testid={view === 'learning' ? 'panel-cvx-learning-result' : 'panel-cvx-result'}>
    <h3 id={titleId}>{view === 'learning' ? t('sa.learnResultTitle') : t('sa.resultTitle')}</h3>
    <AiModelLabel output={explanation.aiModel} testId={view === 'learning' ? 'label-ai-model-cvx-learning' : 'label-ai-model-cvx-result'} />
    {warnings.filter(warning => warning.startsWith('Partial AI analysis:')).map(warning =>
      <p key={warning} className="cvx-limited" role="status"><AlertTriangle size={13} aria-hidden="true" /> {warning}</p>)}
    <p className="muted small">{view === 'learning'
      ? t('sa.learnNote')
      : t('sa.careerNote')}</p>
    <p className="muted small">{t('sa.scoreNote')}</p>
    {warnings.length > 0 && <details className="cvx-data-notes"><summary>{t('sa.sources')}</summary><ul className="cvx-warnings" data-testid="list-cvx-warnings">{warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    <div className="cvx-sections">
      {sectionDefs.filter(({ key }) => cvExplanationSectionInView(key, view) && key !== 'strengths').map(({ key, icon: Icon }) => <details className="cvx-card" key={key} open data-testid={`card-cvx-${key}`}>
        <summary><span className="cvx-card-icon"><Icon size={14} aria-hidden="true" /></span><strong>{t(`sa.sec.${key}`)}</strong><ChevronDown size={15} className="cvx-chevron" aria-hidden="true" /></summary>
        <div className="cvx-card-body">
          {key !== 'careerMatchAnalysis' && <Paragraphs text={sections[key]} />}
          {key === 'skillAnalysis' && <><h4>{t('sa.strengthsLimits')}</h4><Paragraphs text={sections.strengths} /></>}
          {key === 'improvementSuggestions' && view === 'career' && <Paragraphs text={sections.areasForGrowth} />}
          {key === 'careerMatchAnalysis' && (matches.length === 0
            ? <p className="cvx-empty">{t('sa.noMatches')}</p>
            : <div className="cvx-matches">{matches.map(m => <article className="cvx-match" key={m.roleId} data-testid={`card-cvx-match-${m.roleId}`}>
              <h5>{m.title}</h5>
              <Paragraphs text={sections.careerMatchAnalysis.split(/\n+/).find(p => p.trim().startsWith(`${m.title}:`))?.trim().slice(m.title.length + 1).trim() || t('sa.insightMissing')} />
              {m.skillRoleFamily && <p className="muted small">{t('sa.skillRef', { name: m.skillRoleFamily })}</p>}
              <MatchScore metric="cv" variant="bar" value={m.score} matched={m.matchedSkills.length} considered={m.matchedSkills.length + m.missingSkills.length} testId={`score-cvx-${m.roleId}`} />
              <details><summary>{t('sa.viewLists')}</summary>
              {m.matchedSkills.length > 0 && <div className="cvx-chip-row"><span className="cvx-chip-label">{t('sa.matched')}</span>{m.matchedSkills.map(s => <span className="cvx-chip ok" key={s}><Check size={11} aria-hidden="true" />{s}</span>)}</div>}
              {m.missingSkills.length > 0 && <div className="cvx-chip-row"><span className="cvx-chip-label">{t('sa.notSelected')}</span>{m.missingSkills.map(s => <span className="cvx-chip gap" key={s}><X size={11} aria-hidden="true" />{s}</span>)}</div>}
              </details>
            </article>)}</div>)}
          {key === 'improvementSuggestions' && resources.length > 0 && <ul className="cvx-resources">{resources.map(r => <li key={r.id}>
            <a href={r.url} target="_blank" rel="noopener noreferrer" data-testid={`link-cvx-resource-${r.id}`}>{r.title} <ExternalLink size={11} aria-hidden="true" /><span className="sr-only"> {t('common.newTab')}</span></a>
            <span>{r.provider} · {r.cost}{r.skills.length ? ` · ${r.skills.join(', ')}` : ''}</span>
          </li>)}</ul>}
        </div>
      </details>)}
    </div>
    {view === 'career' && <Link href="/learning-roadmap" className="text-link" data-testid="link-cvx-learning-roadmap">{t('sa.continueRoadmap')}</Link>}
  </section>;
}

/** Main explanation and consent surface on the AI Explanation tab, not My profile. */
export function CvCareerExplanation({ showUploadLink = false }: { showUploadLink?: boolean }) {
  const { names } = useSkillAnalysis();
  const { t } = useI18n();
  return <section className="panel panel-pad cvx" aria-labelledby="cvx-title" data-testid="section-ai-career-explanation">
    <div className="cvx-head">
      <span className="cvx-head-icon"><Sparkles size={18} aria-hidden="true" /></span>
      <div>
        <h2 id="cvx-title">{t('sa.title')}</h2>
        <p>{t('sa.intro')}</p>
      </div>
    </div>
    {!names.length && <div className="cvx-start" data-testid="state-cvx-empty">
      <strong>{t('sa.emptyTitle')}</strong>
      <p>{t('sa.emptyBody')}</p>
      <Link href="/my-profile" className="btn btn-primary btn-small" data-testid="link-cvx-upload">{t('sa.addSkills')}</Link>
    </div>}
    {names.length > 0 && <><CvPreview /><ExplanationResult /></>}
  </section>;
}

/** Read-only learning cards from the same transient, explicitly consented CV result. */
export function CvLearningGuidance() {
  const { names, explanation, explainPhase } = useSkillAnalysis();
  const { t } = useI18n();
  const hasResultState = Boolean(explanation) || explainPhase === 'loading' || explainPhase === 'error';
  return <section className="panel panel-pad cvx" aria-labelledby="cvx-learning-title" data-testid="section-cv-learning-guidance">
    <div className="cvx-head">
      <span className="cvx-head-icon"><BookOpen size={18} aria-hidden="true" /></span>
      <div>
        <h2 id="cvx-learning-title">{t('guidance.title')}</h2>
        <p>{t('sa.learnIntro')}</p>
      </div>
    </div>
    {hasResultState ? <ExplanationResult view="learning" /> : <div className="cvx-start" data-testid="state-cvx-learning-empty">
      <strong>{t('sa.learnEmptyTitle')}</strong>
      <p>{t('sa.learnEmptyBody')}</p>
    </div>}
    <Link href={names.length ? '/market-and-ai-impact?tab=ai-impact' : '/my-profile'} className="text-link" data-testid="link-cvx-learning-review">
      {names.length ? t('sa.open') : t('sa.addSkills')}
    </Link>
  </section>;
}
