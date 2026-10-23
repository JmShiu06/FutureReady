import { useEffect, useId, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { createAiExplanation, type AiExplanation, type AiExplanationInput } from '@workspace/api-client-react';
import { AiSkillSuggestions } from './ai-skill-suggestions';
import type { ProfileSkill } from '@/domain/types';
import { AiConsentModel, AiModelLabel } from '@/components/ai-model-label';
import { useI18n } from '@/i18n/i18n-context';

type Feature = AiExplanationInput['feature'];
export const aiFeatureTitles: Record<Feature, string> = {
  'career-explorer': 'Career Explorer',
  'cv-analysis': 'CV skill explanation',
  'learning-roadmap': 'Learning Roadmap',
  'digital-twin': 'Digital Twin',
  'task-exposure': 'AI task support',
  'market-trends': 'Skills Radar',
  'job-fit': 'Job Fit',
  'sdg-contribution': 'SDG Explorer',
  'profile-skills': 'Profile skill suggestions',
};
export const aiFeatureActions: Record<Feature, string> = {
  'career-explorer': 'Explain My Career Match with AI',
  'cv-analysis': 'Explain this detected skill with AI',
  'learning-roadmap': 'Explain My Learning Plan with AI',
  'digital-twin': 'Explain AI Scenarios',
  'task-exposure': 'Explain task support with AI',
  'market-trends': 'Summarise Market Trends with AI',
  'job-fit': 'Explain Job Fit with AI',
  'sdg-contribution': 'Explain SDG Contribution with AI',
  'profile-skills': 'Suggest Skills with AI',
};
const contexts: Record<Feature, string> = {
  'career-explorer': 'Fictional skills, existing exact/related matches and separately labelled TalentCorp/O*NET occupation evidence.',
  'cv-analysis': 'Only one skill name detected in your CV. The file, extracted text, proficiency and other profile data stay out of the AI request.',
  'learning-roadmap': 'Fictional gaps, beginner practice sequence, available study time and a free-practice budget.',
  'digital-twin': 'Fictional before/after overlap and explicit moderate/fast adoption workshop assumptions—not forecasts.',
  'task-exposure': 'Fictional task characteristics, not a skill-replacement prediction.',
  'market-trends': 'Latest available dated DOSM national labour-force observations, with stale-data warnings. Not occupation vacancies or AI causation.',
  'job-fit': 'This listing’s existing description and requirements, compared only with a fictional learner. Demo listings remain labelled as samples.',
  'sdg-contribution': 'Only the selected goal’s source-supported thematic mappings. Unverified examples are refused; thematic relevance is not measured impact.',
  'profile-skills': 'Fictional background and career goal; candidate skills come from existing dataset gaps. Nothing is added automatically.',
};

/** General features use fixed samples; CV Analysis receives one explicitly selected detected skill name only. */
export function AiExplanationPanel({ feature, jobId, goal, cvDetectedSkill, onApplySkills, embedded = false }: {
  feature: Feature; jobId?: string; goal?: number; cvDetectedSkill?: string; embedded?: boolean;
  onApplySkills?: (skills: ProfileSkill[]) => string | undefined;
}) {
  const selectId = useId();
  const { t, ui } = useI18n();
  const scope = feature === 'cv-analysis' ? t('ai.scope.cvSkill', { name: cvDetectedSkill ?? '' }) : feature === 'market-trends' ? t('ai.scope.market') : t('ai.scope.sample');
  const [sampleId, setSampleId] = useState<NonNullable<AiExplanationInput['sampleId']>>('data-starter');
  const [result, setResult] = useState<AiExplanation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    controller.current?.abort();
    controller.current = null;
    setResult(null);
    setError('');
    setLoading(false);
  }, [feature, jobId, goal, cvDetectedSkill]);

  const explain = async () => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; request.abort(); }, 60_000);
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const response = await createAiExplanation({
        feature,
        ...(feature === 'cv-analysis' ? { cvDetectedSkill } : { sampleId }),
        ...(feature === 'job-fit' && jobId ? { jobId } : {}),
        ...(feature === 'sdg-contribution' && goal !== undefined ? { goal } : {}),
      }, { signal: request.signal });
      if (!request.signal.aborted) setResult(response);
    } catch (reason) {
      if (request.signal.aborted && !timedOut) return;
      const detail = (reason as { data?: { error?: unknown } })?.data?.error;
      setError(timedOut ? 'RunPod timed out. Your existing results are unchanged; retry when the GPU is available.' : typeof detail === 'string' ? detail : 'The AI explanation is unavailable. The GPU may be offline. Your existing results are unchanged; please try again.');
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === request) {
        controller.current = null;
        setLoading(false);
      }
    }
  };

  return <section className={embedded ? 'ai-demo-panel ai-demo-embedded' : 'panel panel-pad ai-demo-panel'} aria-label={`${ui(aiFeatureTitles[feature])} ${ui('AI explanation')}`} data-testid={`panel-ai-${feature}`}>
    {!embedded && <h2 className="ai-demo-title"><Sparkles size={17} aria-hidden="true" /> {ui(aiFeatureTitles[feature])} · {ui('AI explanation')}</h2>}
    <p className="muted small">{feature === 'cv-analysis'
      ? ui('Only this detected skill name is sent to the AI service. Your CV file, extracted text, proficiency and other profile data are not sent. The explanation is general and does not verify your skill level.')
      : ui('Only server-owned fictional learner data and selected public evidence go to the AI service—not your saved profile or CV. AI cannot change matches, official data, skill levels, roadmap progress, or team records. Profile suggestions require separate confirmation.')}</p>
    {feature === 'cv-analysis' && cvDetectedSkill && <div className="ai-context-note"><strong>{ui('Detected skill:')}</strong> {cvDetectedSkill}</div>}
    <p className="ai-context-note"><strong>{ui('Evidence used:')}</strong> {ui(contexts[feature])}</p>
    <AiConsentModel scope={scope} testId={`text-ai-consent-model-${feature}`} />
    <div className="ai-demo-controls">
      {!['market-trends', 'sdg-contribution', 'cv-analysis'].includes(feature) && <>
      <label htmlFor={selectId}>{ui('Fictional sample')}</label>
      <select id={selectId} value={sampleId} disabled={loading} onChange={event => {
        setSampleId(event.target.value as NonNullable<AiExplanationInput['sampleId']>);
        setResult(null);
        setError('');
      }} data-testid={`select-ai-sample-${feature}`}>
        <option value="data-starter">{ui('Data starter')} — Python, Excel, data visualization</option>
        <option value="operations-starter">{ui('Operations starter')} — coordination, research, storytelling</option>
      </select>
      </>}
      <button type="button" className="btn btn-secondary" disabled={loading || (feature === 'cv-analysis' && !cvDetectedSkill)} onClick={() => void explain()} data-testid={`button-ai-demo-${feature}`}>
        {loading ? 'Generating explanation…' : aiFeatureActions[feature]}
      </button>
    </div>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p className="muted small" role="status">Waiting for the AI service. Your existing results remain available.</p>}
      {result && <div className="ai-generated-explanation" data-testid={`result-ai-${feature}`}>
        <strong>{result.sampleLabel} · {ui('AI-generated final answer')}</strong>
        <AiModelLabel output={result.aiModel} testId={`label-ai-model-result-${feature}`} />
        <p style={{ whiteSpace: 'pre-line' }}>{result.explanation}</p>
        {result.suggestions && onApplySkills && <AiSkillSuggestions suggestions={result.suggestions} onApply={onApplySkills} />}
        {result.evidence && result.evidence.length > 0 && <ul className="ai-evidence-list" aria-label={ui('Server-selected evidence')}>
          {result.evidence.map((item, index) => <li key={`${item.title}-${index}`}>
            {item.url ? <a href={item.url} className="text-link" target="_blank" rel="noreferrer">{item.title}</a> : <strong>{item.title}</strong>}
            {item.date && <> · {item.date}</>}<p>{item.note}</p>
          </li>)}
        </ul>}
        <details><summary>{ui('Context, figures and limitations (not generated by AI)')}</summary><ul>{result.contextSummary.map(item => <li key={item}>{item}</li>)}</ul></details>
        <span>{ui('Model reasoning traces are rejected. General explanation only—not verified evidence, a hiring decision, or a forecast.')}</span>
      </div>}
    </div>
    {error && <div className="ai-generated-error" role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void explain()} data-testid={`button-ai-retry-${feature}`}>{ui('Retry AI request')}</button></div>}
  </section>;
}
