import { useId } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, BookOpen, Check, ChevronDown, ExternalLink, Languages, Lightbulb, Lock, RotateCcw, Sparkles, Target, Trash2, TrendingUp, X } from 'lucide-react';
import { useCvSession, type CvDraft, type DraftItem } from '@/domain/cv-session';
import { RaccoonLoader } from '@/components/workspace/raccoon-loader';
import { MatchScore } from '@/components/shared/match-score';
import { cvExplanationSectionInView, type CvExplanationView } from '@/domain/cv-explanation-sections';
import './cv-career-explanation.css';

export const NO_SKILLS_MESSAGE = 'No skills detected from CV.';
export const LIMITED_MESSAGE = 'Some information may be incomplete due to CV extraction limitations.';

type ListField = keyof Omit<CvDraft, 'extractionLimited' | 'categories'>;
const sectionDefs = [
  { key: 'skillAnalysis', title: 'Skill analysis', icon: Sparkles },
  { key: 'careerMatchAnalysis', title: 'Career match analysis', icon: Target },
  { key: 'skillGapAnalysis', title: 'Skill gap analysis', icon: AlertTriangle },
  { key: 'improvementSuggestions', title: 'Improvement suggestions', icon: TrendingUp },
  { key: 'strengths', title: 'Strengths', icon: Check },
  { key: 'areasForGrowth', title: 'Areas for growth', icon: Lightbulb },
] as const;

function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n{1,}/).map(t => t.trim()).filter(Boolean).map((t, i) => <p key={i}>{t}</p>)}</>;
}

function ItemRow({ field, item, label }: { field: ListField; item: DraftItem; label: string }) {
  const { updateItem } = useCvSession();
  const id = useId();
  return <div className={`cvx-item${item.include ? '' : ' is-off'}`}>
    <input type="checkbox" id={id} checked={item.include} onChange={e => updateItem(field, item.id, { include: e.target.checked })}
      aria-label={`Include ${label}: ${item.text || 'empty item'}`} data-testid={`checkbox-cvx-${field}-${item.id}`} />
    <label htmlFor={id} className="cvx-skill-label" data-testid={`text-cvx-${field}-${item.id}`}>{item.text}</label>
  </div>;
}

/** Compact name-only sharing controls; no removed CV sections or narrative fields. */
function CvPreview() {
  const { draft, payload, consent, setConsent, requestExplanation, explainPhase, clear } = useCvSession();
  if (!draft || !payload) return null;
  const sendable = Object.entries(payload).some(([k, v]) => k !== 'extractionLimited' && Array.isArray(v) && v.length > 0);
  return <section className="cvx-preview" aria-labelledby="cvx-preview-title" data-testid="panel-cvx-preview">
    <div className="cvx-preview-head">
      <div>
        <h3 id="cvx-preview-title">Review what will be shared</h3>
        <p><Lock size={12} aria-hidden="true" /> Only selected skill names and recognized language names go to RunPod after consent. Education, work history, certifications, projects, fluency ratings, contact details and the CV file are not included.</p>
      </div>
      <button type="button" className="btn btn-secondary btn-small" onClick={clear} data-testid="button-cvx-discard"><Trash2 size={12} aria-hidden="true" /> Discard CV details</button>
    </div>
    {draft.extractionLimited && <p className="cvx-limited" role="note" data-testid="text-cvx-limited"><AlertTriangle size={13} aria-hidden="true" /> {LIMITED_MESSAGE}</p>}

    <details className="cvx-field" data-testid="details-cvx-sharing-names">
      <summary>Choose skill names to share ({payload.skills.length} selected)</summary>
      {draft.skills.length === 0
        ? <p className="cvx-empty" data-testid="text-cvx-no-skills">{NO_SKILLS_MESSAGE}</p>
        : <div className="cvx-skill-grid">{draft.skills.map(item => <ItemRow key={item.id} field="skills" item={item} label="skill name" />)}</div>}
    </details>
    <div className="cvx-field">
      <h4><Languages size={13} aria-hidden="true" /> Languages <span>{payload.languages.length} selected</span></h4>
      {draft.languages.length === 0 ? <p className="cvx-empty">No recognized language names detected. No free-text language descriptions are shared.</p>
        : draft.languages.map(item => <ItemRow key={item.id} field="languages" item={item} label="language name" />)}
    </div>

    <div className="cvx-consent">
      <label>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={!sendable || explainPhase === 'loading'} data-testid="checkbox-cvx-consent" />
        <span>I consent to sending only the selected skill names and language names to RunPod for a one-off explanation. No other CV details are shared. The result is not saved.</span>
      </label>
      <button type="button" className="btn btn-primary" disabled={!consent || !sendable || explainPhase === 'loading'} onClick={requestExplanation} data-testid="button-cvx-generate">
        {explainPhase === 'loading' ? <RaccoonLoader size="small" /> : <Sparkles size={14} aria-hidden="true" />}
        {explainPhase === 'loading' ? 'Generating explanation' : 'Generate AI career explanation'}
      </button>
      {!sendable && <p className="cvx-empty">Select at least one detail to generate an explanation.</p>}
    </div>
  </section>;
}

function ExplanationResult({ view = 'career' }: { view?: CvExplanationView }) {
  const { explanation, explainPhase, explainError, requestExplanation, consent } = useCvSession();
  if (explainPhase === 'loading') return <div className="cvx-skeleton" role="status" aria-live="polite" data-testid="status-cvx-loading">
    <span className="sr-only">Generating your AI career explanation.</span>
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
    <h3 id={titleId}>{view === 'learning' ? 'Your CV learning guidance' : 'Your AI career explanation'}</h3>
    <p className="muted small">{view === 'learning'
      ? 'Improvement options use reviewed CV details and verified learning records. AI explains growth opportunities; suggestions do not verify qualifications or exam readiness.'
      : 'Career alignment uses the selected skill names and dataset references. AI explains skill meanings and gaps; skill and language names do not verify proficiency, experience or qualifications.'}</p>
    {warnings.length > 0 && <ul className="cvx-warnings" data-testid="list-cvx-warnings">{warnings.map(w => <li key={w}>{w}</li>)}</ul>}
    <div className="cvx-sections">
      {sectionDefs.filter(({ key }) => cvExplanationSectionInView(key, view)).map(({ key, title, icon: Icon }, i) => <details className="cvx-card" key={key} open={i === 0} data-testid={`card-cvx-${key}`}>
        <summary><span className="cvx-card-icon"><Icon size={14} aria-hidden="true" /></span><strong>{title}</strong><ChevronDown size={15} className="cvx-chevron" aria-hidden="true" /></summary>
        <div className="cvx-card-body">
          <Paragraphs text={sections[key]} />
          {key === 'careerMatchAnalysis' && (matches.length === 0
            ? <p className="cvx-empty">No career matches were returned for these skills.</p>
            : <div className="cvx-matches">{matches.map(m => <article className="cvx-match" key={m.roleId} data-testid={`card-cvx-match-${m.roleId}`}>
              <h5>{m.title}</h5>
              {m.skillRoleFamily && <p className="muted small">Skill reference: {m.skillRoleFamily} (pooled evidence, not title-specific requirements).</p>}
              <MatchScore metric="cv" variant="bar" value={m.score} matched={m.matchedSkills.length} considered={m.matchedSkills.length + m.missingSkills.length} testId={`score-cvx-${m.roleId}`} />
              {m.matchedSkills.length > 0 && <div className="cvx-chip-row"><span className="cvx-chip-label">Matched</span>{m.matchedSkills.map(s => <span className="cvx-chip ok" key={s}><Check size={11} aria-hidden="true" />{s}</span>)}</div>}
              {m.missingSkills.length > 0 && <div className="cvx-chip-row"><span className="cvx-chip-label">Missing</span>{m.missingSkills.map(s => <span className="cvx-chip gap" key={s}><X size={11} aria-hidden="true" />{s}</span>)}</div>}
            </article>)}</div>)}
          {key === 'improvementSuggestions' && resources.length > 0 && <ul className="cvx-resources">{resources.map(r => <li key={r.id}>
            <a href={r.url} target="_blank" rel="noopener noreferrer" data-testid={`link-cvx-resource-${r.id}`}>{r.title} <ExternalLink size={11} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
            <span>{r.provider} · {r.cost}{r.skills.length ? ` · ${r.skills.join(', ')}` : ''}</span>
          </li>)}</ul>}
        </div>
      </details>)}
    </div>
    {view === 'career' && <Link href="/learning-roadmap" className="text-link" data-testid="link-cvx-learning-roadmap">View improvement suggestions and areas for growth in Learning roadmap</Link>}
  </section>;
}

/** Main explanation and consent surface on the AI Explanation tab, not My profile. */
export function CvCareerExplanation({ showUploadLink = false }: { showUploadLink?: boolean }) {
  const { phase, uploadError, draft } = useCvSession();
  return <section className="panel panel-pad cvx" aria-labelledby="cvx-title" data-testid="section-ai-career-explanation">
    <div className="cvx-head">
      <span className="cvx-head-icon"><Sparkles size={18} aria-hidden="true" /></span>
      <div>
        <h2 id="cvx-title">AI Career Explanation</h2>
        <p>Skill analysis, career matches, gaps and discussion areas based only on selected skill names and languages. Learning guidance is on Learning roadmap.</p>
      </div>
    </div>
    {phase === 'extracting' && <div className="cvx-skeleton" role="status"><span className="sr-only">Reading your CV.</span><RaccoonLoader /><i style={{ width: '80%' }} /><i style={{ width: '60%' }} /></div>}
    {phase === 'error' && <p className="cvx-error" role="alert">{uploadError} No earlier CV details are kept.</p>}
    {(phase === 'idle' || (phase === 'error' && !draft)) && <div className="cvx-start" data-testid="state-cvx-empty">
      <strong>Upload a CV to start.</strong>
      <p>Details from your CV stay in this tab only and disappear when you upload another CV, switch audience or reload.</p>
      {showUploadLink && <Link href="/my-profile" className="btn btn-primary btn-small" data-testid="link-cvx-upload">Upload CV in My profile</Link>}
    </div>}
    {phase === 'ready' && <><CvPreview /><ExplanationResult /></>}
  </section>;
}

/** Read-only learning cards from the same transient, explicitly consented CV result. */
export function CvLearningGuidance() {
  const { phase, draft, explanation, explainPhase } = useCvSession();
  const hasResultState = Boolean(explanation) || explainPhase === 'loading' || explainPhase === 'error';
  return <section className="panel panel-pad cvx" aria-labelledby="cvx-learning-title" data-testid="section-cv-learning-guidance">
    <div className="cvx-head">
      <span className="cvx-head-icon"><BookOpen size={18} aria-hidden="true" /></span>
      <div>
        <h2 id="cvx-learning-title">CV-based learning guidance</h2>
        <p>Improvement suggestions and areas for growth from the CV details you reviewed.</p>
      </div>
    </div>
    {hasResultState ? <ExplanationResult view="learning" /> : <div className="cvx-start" data-testid="state-cvx-learning-empty">
      <strong>{phase === 'extracting' ? 'Reading your CV…' : 'No CV learning guidance yet.'}</strong>
      <p>Upload a CV in My profile, then review and generate its explanation in AI Explanation. Guidance stays in this tab only and clears on a new upload, audience change or reload. Your saved roadmap milestones are separate.</p>
    </div>}
    <Link href={draft ? '/market-and-ai-impact?tab=ai-impact' : '/my-profile'} className="text-link" data-testid="link-cvx-learning-review">
      {draft ? 'Review CV details or generate guidance in AI Explanation' : 'Upload CV in My profile'}
    </Link>
  </section>;
}
