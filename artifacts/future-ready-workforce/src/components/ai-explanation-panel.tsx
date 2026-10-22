import { useEffect, useId, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { createAiExplanation, type AiExplanation, type AiExplanationInput } from '@workspace/api-client-react';

type Feature = AiExplanationInput['feature'];
const titles: Record<Feature, string> = {
  'career-explorer': 'Career Explorer',
  'cv-analysis': 'CV Analysis',
  'learning-roadmap': 'Learning Roadmap',
  'digital-twin': 'Digital Twin',
  'task-exposure': 'AI task support',
};

/** Deliberately independent of workspace/profile state: only fixed example IDs leave the browser. */
export function AiExplanationPanel({ feature }: { feature: Feature }) {
  const selectId = useId();
  const [sampleId, setSampleId] = useState<AiExplanationInput['sampleId']>('data-starter');
  const [result, setResult] = useState<AiExplanation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    controller.current?.abort();
    setResult(null);
    setError('');
    setLoading(false);
  }, [feature]);

  const explain = async () => {
    const request = new AbortController();
    controller.current?.abort();
    controller.current = request;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const response = await createAiExplanation({ feature, sampleId }, { signal: request.signal });
      if (!request.signal.aborted) setResult(response);
    } catch (reason) {
      if (request.signal.aborted) return;
      const detail = (reason as { data?: { error?: unknown } })?.data?.error;
      setError(typeof detail === 'string' ? detail : 'The AI explanation is unavailable. Your existing results are unchanged; please try again.');
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  };

  return <section className="panel panel-pad ai-demo-panel" aria-label={`${titles[feature]} AI explanation`} data-testid={`panel-ai-${feature}`}>
    <h2 className="ai-demo-title"><Sparkles size={17} aria-hidden="true" /> {titles[feature]} · Qwen3 explanation</h2>
    <p className="muted small">Synthetic demonstration only. RunPod receives a server-owned fictional example—not your saved profile or CV. This explanation cannot change matches, official data, skill levels, roadmap progress, or team records.</p>
    <div className="ai-demo-controls">
      <label htmlFor={selectId}>Fictional sample</label>
      <select id={selectId} value={sampleId} disabled={loading} onChange={event => {
        setSampleId(event.target.value as AiExplanationInput['sampleId']);
        setResult(null);
        setError('');
      }} data-testid={`select-ai-sample-${feature}`}>
        <option value="data-starter">Data starter — Python, Excel, data visualization</option>
        <option value="operations-starter">Operations starter — coordination, research, storytelling</option>
      </select>
      <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void explain()} data-testid={`button-ai-demo-${feature}`}>
        {loading ? 'Generating explanation…' : 'Explain synthetic example'}
      </button>
    </div>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p className="muted small" role="status">Waiting for RunPod. Your existing results remain available.</p>}
      {result && <div className="ai-generated-explanation" data-testid={`result-ai-${feature}`}>
        <strong>{result.sampleLabel} · AI-generated final answer</strong>
        <p style={{ whiteSpace: 'pre-line' }}>{result.explanation}</p>
        <details><summary>Example context and limitations</summary><ul>{result.contextSummary.map(item => <li key={item}>{item}</li>)}</ul></details>
        <span>Qwen3 thinking mode disabled. General explanation only—not verified evidence, a hiring decision, or a forecast.</span>
      </div>}
    </div>
    {error && <p className="ai-generated-error" role="alert">{error}</p>}
  </section>;
}
