import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Info, Loader2, Plus, X } from 'lucide-react';
import {
  useListCareerSkills,
  useMatchCareers,
  type CareerMatch,
} from './_api';

const EXAMPLES: { label: string; skills: string[] }[] = [
  { label: 'Software development example', skills: ['java', 'python', 'git', 'docker', 'sql', 'aws', 'typescript'] },
  { label: 'Data analysis example', skills: ['sql', 'excel', 'power bi', 'tableau', 'python', 'data visualization', 'statistics'] },
];

const MAX_SKILLS = 50;
const MAX_LEN = 60;

function errorMessage(error: unknown): string {
  const data = (error as { data?: { error?: string } | null } | null)?.data;
  if (data && typeof data.error === 'string') return data.error;
  return 'We could not reach the matching service. Please try again.';
}

export function CareerMatcher({ onTopMatch }: { onTopMatch?: (match: CareerMatch | null) => void }) {
  const [skills, setSkills] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [inputError, setInputError] = useState('');
  const suggestions = useListCareerSkills();
  const match = useMatchCareers();
  const result = match.data;

  useEffect(() => {
    onTopMatch?.(result && result.matches.length ? result.matches[0] : null);
  }, [result, onTopMatch]);

  const addSkills = (raw: string[]) => {
    const cleaned = raw.map(s => s.trim()).filter(Boolean);
    if (cleaned.some(s => s.length > MAX_LEN)) { setInputError(`Each skill can be up to ${MAX_LEN} characters.`); return; }
    const next = [...skills];
    for (const s of cleaned) if (!next.some(x => x.toLowerCase() === s.toLowerCase())) next.push(s);
    if (next.length > MAX_SKILLS) { setInputError(`You can add up to ${MAX_SKILLS} skills.`); return; }
    setInputError('');
    setSkills(next);
  };

  const submitDraft = (event: FormEvent) => {
    event.preventDefault();
    addSkills(draft.split(','));
    setDraft('');
  };

  const run = (list: string[]) => match.mutate({ data: { skills: list } });

  return <div>
    <form onSubmit={submitDraft} className="filter-row" style={{ marginBottom: 10 }}>
      <input
        className="select-field" style={{ flex: 1, minWidth: 180 }} list="career-skill-options"
        value={draft} onChange={e => setDraft(e.target.value)} maxLength={MAX_LEN}
        placeholder="Type a skill, e.g. python or node.js" aria-label="Add a skill" data-testid="input-match-skill"
      />
      <datalist id="career-skill-options">{(suggestions.data?.skills ?? []).map(s => <option key={s} value={s} />)}</datalist>
      <button type="submit" className="btn btn-secondary btn-small" data-testid="button-match-add"><Plus size={11} /> Add</button>
    </form>
    {inputError && <div className="match-error" role="alert">{inputError}</div>}
    <div className="filter-row" style={{ marginBottom: 10 }}>
      {EXAMPLES.map(ex => <button key={ex.label} type="button" className="btn btn-quiet btn-small" onClick={() => { setSkills(ex.skills); setInputError(''); run(ex.skills); }}>{ex.label}</button>)}
    </div>
    {skills.length > 0 && <div className="skill-chips" style={{ marginBottom: 12 }}>
      {skills.map(s => <span className="chip match-chip" key={s}>{s}
        <button type="button" aria-label={`Remove ${s}`} onClick={() => setSkills(skills.filter(x => x !== s))}><X size={9} /></button></span>)}
    </div>}
    <button type="button" className="btn btn-primary" disabled={skills.length === 0 || match.isPending} onClick={() => run(skills)} data-testid="button-find-matches">
      {match.isPending ? <><Loader2 size={13} className="spin" /> Matching…</> : <>Find matching roles <ArrowRight size={13} /></>}
    </button>

    <div style={{ marginTop: 16 }} aria-live="polite">
      {match.isPending && <div className="empty-state">Comparing your skills with the role dataset…</div>}
      {match.isError && <div className="match-error" role="alert" data-testid="match-error">{errorMessage(match.error)}</div>}
      {!result && !match.isPending && !match.isError && <div className="empty-state">Add your skills (or try an example) to see which role families share the most skills with you.</div>}
      {result && !match.isPending && result.matches.length === 0 && <div className="empty-state" data-testid="match-empty">None of your skills appear in the dataset's role skill lists.</div>}
      {result && !match.isPending && result.matches.length > 0 && <div className="role-list">
        {result.matches.slice(0, 6).map(m => <div className="role-row match-row" key={m.roleFamily} data-testid={`match-${m.roleFamily}`}>
          <span><h3>{m.roleFamily}</h3>
            <p>{m.matchedSkills.length} of {m.skillsConsidered} listed skills matched</p>
            <div className="skill-chips" style={{ marginTop: 6 }}>{m.matchedSkills.map(s => <span className="chip" key={s}>{s}</span>)}</div>
            <div className="skill-chips" style={{ marginTop: 4 }}>{m.missingSkills.slice(0, 6).map(s => <span className="chip gap" key={s}>{s}</span>)}
              {m.missingSkills.length > 6 && <span className="chip gap">+{m.missingSkills.length - 6} more not yet matched</span>}</div>
          </span>
          <span className="match-pill">{m.score}%</span>
        </div>)}
      </div>}
      {result && result.unrecognizedSkills.length > 0 && <p className="section-kicker" style={{ marginTop: 10, textTransform: 'none' }}>Not found in the dataset (not scored): {result.unrecognizedSkills.join(', ')}</p>}
    </div>

    <div className="disclaimer"><Info size={14} /><span>
      {result
        ? <>{result.scoring.label}: {result.scoring.formula}. {result.scoring.note} Source: {result.source.datasetName} by {result.source.publisher} ({result.source.license}). {result.source.geographyNote}</>
        : <>Scores show dataset skill overlap (matched skills / 30 × 100). They are not a probability of getting a job and are not Malaysia-specific. Data: Qarera job-posting skills, CC BY 4.0.</>}
    </span></div>
  </div>;
}
