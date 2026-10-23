import { useId } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, BookOpen, Check, ChevronDown, ExternalLink, Lightbulb, Lock, RotateCcw, Sparkles, Target, Trash2, TrendingUp, X } from 'lucide-react';
import { useSkillAnalysis } from '@/domain/skill-analysis-session';
import { RaccoonLoader } from '@/components/workspace/raccoon-loader';
import { MatchScore } from '@/components/shared/match-score';
import { cvExplanationSectionInView, type CvExplanationView } from '@/domain/cv-explanation-sections';
import './cv-career-explanation.css';

export const NO_SKILLS_MESSAGE = 'No skills detected from CV.';
export const LIMITED_MESSAGE = 'Some information may be incomplete due to CV extraction limitations.';

const sectionDefs = [
  { key: 'skillAnalysis', title: 'Overall Skill Profile', icon: Sparkles },
  { key: 'careerMatchAnalysis', title: 'Career Match Insights', icon: Target },
  { key: 'skillGapAnalysis', title: 'Priority Skill Gaps', icon: AlertTriangle },
  { key: 'improvementSuggestions', title: 'Recommended Next Steps', icon: TrendingUp },
  { key: 'strengths', title: 'Strengths', icon: Check },
  { key: 'areasForGrowth', title: 'Areas for growth', icon: Lightbulb },
] as const;

function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n{1,}/).map(t => t.trim()).filter(Boolean).map((t, i) => <p key={i}>{t}</p>)}</>;
}

/** Review saved skill names only; never reads the CV session. */
function CvPreview() {
  const { names, selected, toggleSkill, consent, setConsent, requestExplanation, explainPhase, clear } = useSkillAnalysis();
  const id = useId();
  const sendable = selected.length > 0;
  return <section className="cvx-preview" aria-labelledby="cvx-preview-title" data-testid="panel-cvx-preview">
    <div className="cvx-preview-head">
      <div>
        <h3 id="cvx-preview-title">Review what will be shared</h3>
        <p><Lock size={12} aria-hidden="true" /> Only selected saved skill names go to RunPod after consent. Manually added skills are included. Ratings, languages, personal details and documents are not shared.</p>
      </div>
      <button type="button" className="btn btn-secondary btn-small" onClick={clear} data-testid="button-cvx-discard"><Trash2 size={12} aria-hidden="true" /> Clear analysis</button>
    </div>
    <details className="cvx-field" data-testid="details-cvx-sharing-names" open>
      <summary>Choose saved skills to analyse ({selected.length} selected)</summary>
      <div className="cvx-skill-grid">{names.map((name, index) => <div className={`cvx-item${selected.includes(name) ? '' : ' is-off'}`} key={name}>
        <input id={`${id}-${index}`} type="checkbox" checked={selected.includes(name)} onChange={() => toggleSkill(name)} aria-label={`Include skill: ${name}`} />
        <label htmlFor={`${id}-${index}`} className="cvx-skill-label">{name}</label>
      </div>)}</div>
    </details>
    {names.length > 50 && <p className="cvx-empty">Analyse up to 50 selected skills at a time.</p>}

    <div className="cvx-consent">
      <label>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={!sendable || explainPhase === 'loading'} data-testid="checkbox-cvx-consent" />
        <span>I consent to sending only the selected saved skill names to RunPod Qwen/Qwen3-4B for a one-off skill analysis. No ratings or other profile details are shared. The result is not saved.</span>
      </label>
      <button type="button" className="btn btn-primary" disabled={!consent || !sendable || explainPhase === 'loading'} onClick={requestExplanation} data-testid="button-cvx-generate">
        {explainPhase === 'loading' ? <RaccoonLoader size="small" /> : <Sparkles size={14} aria-hidden="true" />}
        {explainPhase === 'loading' ? 'Analysing skills' : 'Analyse my skills'}
      </button>
      {!sendable && <p className="cvx-empty">Select at least one saved skill to start analysis.</p>}
    </div>
  </section>;
}

function ExplanationResult({ view = 'career' }: { view?: CvExplanationView }) {
  const { explanation, explainPhase, explainError, requestExplanation, consent } = useSkillAnalysis();
  if (explainPhase === 'loading') return <div className="cvx-skeleton" role="status" aria-live="polite" data-testid="status-cvx-loading">
    <span className="sr-only">Analysing your saved skills.</span>
    <RaccoonLoader />
    {Array.from({ length: 4 }, (_, i) => <i key={i} style={{ width: `${92 - i * 14}%` }} />)}
  </div>;
  if (explainPhase === 'error') return <div className="cvx-error" role="alert" data-testid="error-cvx">
    <p>{explainError}</p>
    <button type="button" className="btn btn-secondary btn-small" onClick={requestExplanation} disabled={!consent} data-testid="button-cvx-retry"><RotateCcw size={12} aria-hidden="true" /> Try again</button>
  </div>;
  if (!explanation) return null;
  const { sections, matches, resources, warnings } = explanation;
  const titleId = view === 'learning' ? 'cvx-learning-result-title' : 'cvx-result-title';
  return <section className="cvx-result" aria-labelledby={titleId} data-testid={view === 'learning' ? 'panel-cvx-learning-result' : 'panel-cvx-result'}>
    <h3 id={titleId}>{view === 'learning' ? 'Your skill-based learning guidance' : 'Your skill analysis'}</h3>
    {warnings.filter(warning => warning.startsWith('Partial AI analysis:')).map(warning =>
      <p key={warning} className="cvx-limited" role="status"><AlertTriangle size={13} aria-hidden="true" /> {warning}</p>)}
    <p className="muted small">{view === 'learning'
      ? 'Improvement options use selected saved skills and verified learning records. Suggestions do not verify qualifications or exam readiness.'
      : 'Explore how your selected skills work together, where they may transfer and what to practise next. Skill names alone do not verify proficiency, experience or qualifications.'}</p>
    <p className="muted small">Scores measure skill-reference overlap, not hiring probability. Skills not selected from your profile are not necessarily skills you lack.</p>
    {warnings.length > 0 && <details className="cvx-data-notes"><summary>Sources, shared references &amp; limitations</summary><ul className="cvx-warnings" data-testid="list-cvx-warnings">{warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    <div className="cvx-sections">
      {sectionDefs.filter(({ key }) => cvExplanationSectionInView(key, view) && key !== 'strengths').map(({ key, title, icon: Icon }) => <details className="cvx-card" key={key} open data-testid={`card-cvx-${key}`}>
        <summary><span className="cvx-card-icon"><Icon size={14} aria-hidden="true" /></span><strong>{title}</strong><ChevronDown size={15} className="cvx-chevron" aria-hidden="true" /></summary>
        <div className="cvx-card-body">
          {key !== 'careerMatchAnalysis' && <Paragraphs text={sections[key]} />}
          {key === 'skillAnalysis' && <><h4>Potential strengths &amp; evidence limits</h4><Paragraphs text={sections.strengths} /></>}
          {key === 'improvementSuggestions' && view === 'career' && <Paragraphs text={sections.areasForGrowth} />}
          {key === 'careerMatchAnalysis' && (matches.length === 0
            ? <p className="cvx-empty">No career matches were returned for these skills.</p>
            : <div className="cvx-matches">{matches.map(m => <article className="cvx-match" key={m.roleId} data-testid={`card-cvx-match-${m.roleId}`}>
              <h5>{m.title}</h5>
              <Paragraphs text={sections.careerMatchAnalysis.split(/\n+/).find(p => p.trim().startsWith(`${m.title}:`))?.trim().slice(m.title.length + 1).trim() || 'This career insight was not provided. Review the reference evidence below.'} />
              {m.skillRoleFamily && <p className="muted small">Skill reference: {m.skillRoleFamily} (pooled evidence, not title-specific requirements).</p>}
              <MatchScore metric="cv" variant="bar" value={m.score} matched={m.matchedSkills.length} considered={m.matchedSkills.length + m.missingSkills.length} testId={`score-cvx-${m.roleId}`} />
              <details><summary>View matched &amp; unevidenced skill lists</summary>
              {m.matchedSkills.length > 0 && <div className="cvx-chip-row"><span className="cvx-chip-label">Matched</span>{m.matchedSkills.map(s => <span className="cvx-chip ok" key={s}><Check size={11} aria-hidden="true" />{s}</span>)}</div>}
              {m.missingSkills.length > 0 && <div className="cvx-chip-row"><span className="cvx-chip-label">Not selected from profile — not proof of missing ability</span>{m.missingSkills.map(s => <span className="cvx-chip gap" key={s}><X size={11} aria-hidden="true" />{s}</span>)}</div>}
              </details>
            </article>)}</div>)}
          {key === 'improvementSuggestions' && resources.length > 0 && <ul className="cvx-resources">{resources.map(r => <li key={r.id}>
            <a href={r.url} target="_blank" rel="noopener noreferrer" data-testid={`link-cvx-resource-${r.id}`}>{r.title} <ExternalLink size={11} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
            <span>{r.provider} · {r.cost}{r.skills.length ? ` · ${r.skills.join(', ')}` : ''}</span>
          </li>)}</ul>}
        </div>
      </details>)}
    </div>
    {view === 'career' && <Link href="/learning-roadmap" className="text-link" data-testid="link-cvx-learning-roadmap">Continue with your Learning roadmap</Link>}
  </section>;
}

/** Main explanation and consent surface on the AI Explanation tab, not My profile. */
export function CvCareerExplanation({ showUploadLink = false }: { showUploadLink?: boolean }) {
  const { names } = useSkillAnalysis();
  return <section className="panel panel-pad cvx" aria-labelledby="cvx-title" data-testid="section-ai-career-explanation">
    <div className="cvx-head">
      <span className="cvx-head-icon"><Sparkles size={18} aria-hidden="true" /></span>
      <div>
        <h2 id="cvx-title">Skill analysis</h2>
        <p>Analyse the skills saved in My profile, including manually added skills. Explore how they work together, career alignment and learning priorities. No CV upload is required.</p>
      </div>
    </div>
    {!names.length && <div className="cvx-start" data-testid="state-cvx-empty">
      <strong>Add and save skills in My profile to start.</strong>
      <p>Both manually added and reviewed imported skills can be analysed. Your profile remains unchanged by the analysis.</p>
      <Link href="/my-profile" className="btn btn-primary btn-small" data-testid="link-cvx-upload">Add skills in My profile</Link>
    </div>}
    {names.length > 0 && <><CvPreview /><ExplanationResult /></>}
  </section>;
}

/** Read-only learning cards from the same transient, explicitly consented CV result. */
export function CvLearningGuidance() {
  const { names, explanation, explainPhase } = useSkillAnalysis();
  const hasResultState = Boolean(explanation) || explainPhase === 'loading' || explainPhase === 'error';
  return <section className="panel panel-pad cvx" aria-labelledby="cvx-learning-title" data-testid="section-cv-learning-guidance">
    <div className="cvx-head">
      <span className="cvx-head-icon"><BookOpen size={18} aria-hidden="true" /></span>
      <div>
        <h2 id="cvx-learning-title">Skill-based learning guidance</h2>
        <p>Improvement suggestions and areas for growth from your selected saved skills.</p>
      </div>
    </div>
    {hasResultState ? <ExplanationResult view="learning" /> : <div className="cvx-start" data-testid="state-cvx-learning-empty">
      <strong>No skill-based learning guidance yet.</strong>
      <p>Save your skills in My profile, then choose which to analyse in Skill analysis. Results stay in memory and clear when saved skill names change, on audience switch or reload. Your saved roadmap milestones are separate.</p>
    </div>}
    <Link href={names.length ? '/market-and-ai-impact?tab=ai-impact' : '/my-profile'} className="text-link" data-testid="link-cvx-learning-review">
      {names.length ? 'Open Skill analysis' : 'Add skills in My profile'}
    </Link>
  </section>;
}
