import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Check, ChevronDown, CloudUpload, FileText, Info, Loader2, Plus, RotateCcw, X } from 'lucide-react';
import {
  extractCvSkills,
  matchCareers,
  useListCareerSkills,
  type CareerMatch,
  type CareerMatchResult,
} from '@workspace/api-client-react';
import './career-matcher.css';

const MAX_SKILLS = 50;
const MAX_LEN = 60;
const MAX_BYTES = 5 * 1024 * 1024;

type Phase = 'idle' | 'extracting' | 'review' | 'confirmed' | 'matching' | 'results' | 'extraction-error' | 'matching-error';
type Origin = 'cv' | 'manual' | 'profile';

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
const key = (s: string) => norm(s).toLowerCase();

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const n = norm(raw);
    if (!n || n.length > MAX_LEN || seen.has(key(n))) continue;
    seen.add(key(n));
    out.push(n);
  }
  return out;
}

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { error?: string } | null } | null)?.data;
  if (data && typeof data.error === 'string') return data.error;
  return fallback;
}

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export interface CareerMatcherProps {
  onTopMatch?: (match: CareerMatch | null) => void;
  onConfirmSkills: (skills: string[]) => void;
  savedSkills: string[];
}

export function CareerMatcher({ onTopMatch, onConfirmSkills, savedSkills }: CareerMatcherProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<CareerMatchResult | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [inputError, setInputError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const genRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const confirmedRef = useRef<string[] | null>(null);
  const onTopRef = useRef(onTopMatch);
  onTopRef.current = onTopMatch;
  const onConfirmRef = useRef(onConfirmSkills);
  onConfirmRef.current = onConfirmSkills;

  const catalogue = useListCareerSkills();

  const invalidate = useCallback(() => {
    genRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    onTopRef.current?.(null);
    return genRef.current;
  }, []);

  useEffect(() => () => {
    genRef.current += 1;
    abortRef.current?.abort();
    fileRef.current = null;
  }, []);

  const runExtraction = useCallback(async (file: File) => {
    const gen = invalidate();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    confirmedRef.current = null;
    setSkills([]); setResult(null); setWarnings([]); setError(''); setInputError(''); setOrigin(null); setOpenRole(null);
    setPhase('extracting');
    setStatus(`Reading ${file.name}`);
    try {
      const res = await extractCvSkills({ file }, { signal: ctrl.signal });
      if (gen !== genRef.current) return;
      fileRef.current = null; // release raw file after success
      const list = dedupe(res.skills);
      setSkills(list);
      setWarnings(res.warnings ?? []);
      setOrigin('cv');
      setAnimKey(k => k + 1);
      setPhase('review');
      setStatus(list.length ? `${list.length} skills detected. Review them below.` : 'No dataset skills were detected in this CV.');
    } catch (e) {
      if (isAbort(e) || gen !== genRef.current) return;
      setError(errorMessage(e, 'We could not read that CV. Please try again or choose another file.'));
      setPhase('extraction-error');
      setStatus('Skill extraction failed.');
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }, [invalidate]);

  const acceptFile = (file: File | undefined | null) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      invalidate();
      fileRef.current = null;
      setFileMeta({ name: file.name, size: file.size });
      setSkills([]); setResult(null); confirmedRef.current = null;
      setError('This file is larger than 5 MB. Please choose a smaller PDF, DOCX, TXT, JPG, JPEG or PNG file.');
      setPhase('extraction-error');
      return;
    }
    fileRef.current = file;
    setFileMeta({ name: file.name, size: file.size });
    void runExtraction(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
    e.target.value = '';
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    invalidate();
    fileRef.current = null;
    confirmedRef.current = null;
    setFileMeta(null); setSkills([]); setResult(null); setWarnings([]); setError(''); setInputError(''); setOrigin(null); setDraft(''); setOpenRole(null);
    setPhase('idle');
    setStatus('Workspace cleared.');
  };

  const seed = (list: string[], from: Origin) => {
    invalidate();
    fileRef.current = null;
    confirmedRef.current = null;
    setResult(null); setError(''); setInputError(''); setWarnings([]); setOpenRole(null);
    if (from !== 'cv') setFileMeta(null);
    const d = dedupe(list);
    setSkills(d); setOrigin(from); setAnimKey(k => k + 1);
    setPhase('review');
    setStatus(from === 'profile' ? `${d.length} saved profile skills loaded for review.` : 'Add your skills manually below.');
  };

  // Any edit after confirmation invalidates confirmation and results.
  const editSkills = (next: string[]) => {
    if (phase !== 'review') {
      invalidate();
      confirmedRef.current = null;
      setResult(null); setError(''); setOpenRole(null);
      setPhase('review');
    }
    setSkills(next);
  };

  const removeSkill = (s: string) => { editSkills(skills.filter(x => x !== s)); setInputError(''); setStatus(`Removed ${s}`); };

  const addDraft = (e: FormEvent) => {
    e.preventDefault();
    const parts = draft.split(',').map(norm).filter(Boolean);
    if (!parts.length) return;
    if (parts.some(p => p.length > MAX_LEN)) { setInputError(`Each skill can be up to ${MAX_LEN} characters.`); return; }
    const existing = new Set(skills.map(key));
    const fresh = dedupe(parts).filter(p => !existing.has(key(p)));
    if (!fresh.length) { setInputError('That skill is already in your list.'); return; }
    if (skills.length + fresh.length > MAX_SKILLS) { setInputError(`You can keep up to ${MAX_SKILLS} skills.`); return; }
    setInputError('');
    editSkills([...skills, ...fresh]);
    setDraft('');
    setStatus(`Added ${fresh.join(', ')}`);
  };

  const tooMany = skills.length > MAX_SKILLS;
  const isConfirmed = phase === 'confirmed' || phase === 'matching' || phase === 'results' || phase === 'matching-error';
  const canConfirm = phase === 'review' && skills.length > 0 && !tooMany;

  const confirm = () => {
    if (!canConfirm) return;
    const list = [...skills];
    confirmedRef.current = list;
    onConfirmRef.current(list);
    setPhase('confirmed');
    setStatus(`${list.length} skills confirmed. You can now find matching careers.`);
  };

  const runMatch = async () => {
    const list = confirmedRef.current;
    if (!list || !list.length) return;
    const gen = invalidate();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setResult(null); setError(''); setOpenRole(null);
    setPhase('matching');
    setStatus('Comparing your reviewed skills with the role dataset.');
    try {
      const res = await matchCareers({ skills: list }, { signal: ctrl.signal });
      if (gen !== genRef.current) return;
      setResult(res);
      setPhase('results');
      onTopRef.current?.(res.matches[0] ?? null);
      setStatus(res.matches.length ? `${res.matches.length} role families ranked.` : 'No role families share these skills.');
    } catch (e) {
      if (isAbort(e) || gen !== genRef.current) return;
      setError(errorMessage(e, 'We could not reach the matching service. Your reviewed skills are kept, so you can retry.'));
      setPhase('matching-error');
      setStatus('Matching failed.');
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  };

  const showReview = phase !== 'idle' && phase !== 'extracting' && phase !== 'extraction-error';
  const stepState = (n: 1 | 2 | 3) => {
    if (n === 1) return phase === 'idle' || phase === 'extracting' || phase === 'extraction-error' ? 'active' : 'done';
    if (n === 2) return phase === 'review' ? 'active' : isConfirmed ? 'done' : 'todo';
    return phase === 'results' ? 'done' : isConfirmed ? 'active' : 'todo';
  };

  const Step = ({ n, title, sub }: { n: 1 | 2 | 3; title: string; sub: string }) => (
    <div className={`cm-step-head is-${stepState(n)}`}>
      <span className="cm-step-num" aria-hidden="true">{`0${n}`}</span>
      <div><h3>{title}</h3><p>{sub}</p></div>
    </div>
  );

  return <div className="cm" data-testid="career-matcher">
    <div className="sr-only" aria-live="polite" role="status" data-testid="status-career-matcher">{status}</div>

    {/* 01 Upload */}
    <section className="cm-step" aria-labelledby="cm-s1">
      <Step n={1} title="Upload your CV" sub="Discover careers that fit your skills. Your CV and document text are not saved." />
      <span id="cm-s1" className="sr-only">Step 1, upload your CV</span>
      <div
        className={`cm-drop${dragOver ? ' is-over' : ''}${phase === 'extracting' ? ' is-busy' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        data-testid="dropzone-cv"
      >
        <input ref={inputRef} id="cm-cv-input" type="file" className="sr-only"
          accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png"
          onChange={onFileChange} aria-label="Choose a CV file (PDF, DOCX, TXT, JPG, JPEG or PNG, up to 5 MB)" data-testid="input-cv-file" />
        {phase === 'extracting' ? <>
          <Loader2 size={22} className="spin cm-drop-icon" aria-hidden="true" />
          <strong>Reading your CV</strong>
          <span className="cm-drop-meta" data-testid="text-cv-filename">{fileMeta?.name} · {fileMeta && formatSize(fileMeta.size)}</span>
          <div className="cm-indeterminate" aria-hidden="true"><i /></div>
          <button type="button" className="btn btn-quiet btn-small" onClick={reset} data-testid="button-cancel-extraction">Cancel</button>
        </> : fileMeta ? <>
          <FileText size={22} className="cm-drop-icon" aria-hidden="true" />
          <strong data-testid="text-cv-filename">{fileMeta.name}</strong>
          <span className="cm-drop-meta" data-testid="text-cv-filesize">{formatSize(fileMeta.size)}{origin === 'cv' ? ' · skills extracted' : ''}</span>
          <div className="cm-row">
            <label htmlFor="cm-cv-input" className="cm-pill" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }} data-testid="button-replace-cv">Replace file</label>
            <button type="button" className="cm-pill is-quiet" onClick={reset} data-testid="button-start-again"><RotateCcw size={12} /> Start again</button>
          </div>
        </> : <>
          <CloudUpload size={24} className="cm-drop-icon" aria-hidden="true" />
          <strong>Drop your CV here</strong>
          <span className="cm-drop-meta">PDF, DOCX, TXT, JPG, JPEG or PNG · up to 5 MB</span>
          <label htmlFor="cm-cv-input" className="cm-pill" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }} data-testid="button-choose-cv">Choose a file</label>
        </>}
      </div>
      {phase === 'extraction-error' && <div className="match-error cm-err" role="alert" data-testid="error-extraction">
        <span>{error}</span>
        <div className="cm-row">
          {fileRef.current && <button type="button" className="btn btn-secondary btn-small" onClick={() => fileRef.current && runExtraction(fileRef.current)} data-testid="button-retry-extraction"><RotateCcw size={11} /> Retry</button>}
          <label htmlFor="cm-cv-input" className="btn btn-quiet btn-small" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click(); }} data-testid="button-choose-another">Choose another file</label>
          <button type="button" className="btn btn-quiet btn-small" onClick={() => seed([], 'manual')} data-testid="button-manual-after-error">Enter skills manually</button>
        </div>
      </div>}
      {(phase === 'idle') && <div className="cm-row cm-alt">
        <span>No CV to hand?</span>
        <button type="button" className="text-link" onClick={() => seed([], 'manual')} data-testid="button-manual-entry">Enter skills manually</button>
        {savedSkills.length > 0 && <button type="button" className="text-link" onClick={() => seed(savedSkills, 'profile')} data-testid="button-use-saved-skills">Use saved profile skills ({savedSkills.length})</button>}
      </div>}
    </section>

    {/* 02 Review */}
    <section className={`cm-step${showReview ? '' : ' is-locked'}`}>
      <Step n={2} title="Extract and review skills" sub="Keep what is true, remove what is not, add what is missing." />
      {phase === 'extracting' && <div className="cm-skeleton" aria-hidden="true">{[64, 88, 52, 76, 60, 94].map((w, i) => <i key={i} style={{ width: w }} />)}</div>}
      {!showReview && phase !== 'extracting' && <p className="cm-empty">Detected skills will appear here for you to check.</p>}
      {showReview && <>
        <div className="cm-origin" data-testid="text-skill-origin">
          {origin === 'cv' && <>Detected in your CV · {skills.length} skill{skills.length === 1 ? '' : 's'}</>}
          {origin === 'profile' && <>Loaded from your saved profile (not CV detected) · {skills.length}</>}
          {origin === 'manual' && <>Entered by you · {skills.length}</>}
          <span className={tooMany ? 'cm-over' : ''}> / {MAX_SKILLS} max</span>
        </div>
        {warnings.length > 0 && <ul className="cm-warn" data-testid="list-extraction-warnings">{warnings.map(w => <li key={w}>{w}</li>)}</ul>}
        {origin === 'cv' && skills.length === 0 && <div className="cm-empty-box" data-testid="empty-extraction">
          <strong>We did not find skills from the dataset in this CV.</strong>
          <span>Add them yourself below, or try a different file.</span>
          <label htmlFor="cm-cv-input" className="cm-pill" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click(); }}>Choose another file</label>
        </div>}
        {skills.length > 0 && <ul className="cm-chips" key={animKey} data-testid="list-review-skills">
          {skills.map((s, i) => <li className="cm-chip" key={key(s)} style={{ animationDelay: `${Math.min(i * 22, 440)}ms` }} data-testid={`chip-skill-${i}`}>
            <span>{s}</span>
            <button type="button" aria-label={`Remove ${s}`} onClick={() => removeSkill(s)} data-testid={`button-remove-skill-${i}`}><X size={11} /></button>
          </li>)}
        </ul>}
        {tooMany && <div className="match-error" role="alert" data-testid="error-too-many">You have {skills.length} skills. Remove {skills.length - MAX_SKILLS} to confirm (limit {MAX_SKILLS}).</div>}
        <form className="cm-add" onSubmit={addDraft}>
          <label htmlFor="cm-add-input" className="sr-only">Add a missing skill</label>
          <input id="cm-add-input" className="select-field" list="cm-skill-options" value={draft} maxLength={MAX_LEN}
            onChange={e => { setDraft(e.target.value); setInputError(''); }} placeholder="Add a missing skill, e.g. sql" data-testid="input-add-skill" />
          <datalist id="cm-skill-options">{(catalogue.data?.skills ?? []).map(s => <option key={s} value={s} />)}</datalist>
          <button type="submit" className="btn btn-secondary btn-small" data-testid="button-add-skill-review"><Plus size={11} /> Add</button>
        </form>
        {inputError && <div className="match-error" role="alert" data-testid="error-add-skill">{inputError}</div>}
        <p className="cm-note"><Info size={12} /> Extraction can make mistakes. Only confirmed skills are used for matching and saved to your profile.</p>
        <div className="cm-row">
          {phase === 'review'
            ? <button type="button" className="btn btn-primary" disabled={!canConfirm} onClick={confirm} data-testid="button-confirm-skills"><Check size={13} /> Confirm {skills.length} skill{skills.length === 1 ? '' : 's'}</button>
            : <span className="cm-confirmed" data-testid="status-skills-confirmed"><Check size={13} /> Skills confirmed. Editing will ask you to confirm again.</span>}
          {origin !== 'cv' && phase === 'review' && <label htmlFor="cm-cv-input" className="btn btn-quiet btn-small" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click(); }}>Upload a CV instead</label>}
          {origin !== 'cv' && <button type="button" className="btn btn-quiet btn-small" onClick={reset} data-testid="button-reset-review"><RotateCcw size={11} /> Start again</button>}
        </div>
      </>}
    </section>

    {/* 03 Discover */}
    <section className={`cm-step${isConfirmed ? '' : ' is-locked'}`}>
      <Step n={3} title="Discover matching careers" sub="Role families ranked by how many of their listed skills you share." />
      <div className="cm-row">
        <button type="button" className="btn btn-primary" disabled={!isConfirmed || phase === 'matching'} onClick={runMatch} data-testid="button-find-matches">
          {phase === 'matching' ? <><Loader2 size={13} className="spin" /> Matching</> : <>{phase === 'results' ? 'Run again' : 'Find matching careers'} <ArrowRight size={13} /></>}
        </button>
        {isConfirmed && <Link href="/jobs" className="btn btn-secondary" data-testid="link-continue-jobs">Continue to Job Search <ArrowRight size={13} /></Link>}
      </div>
      {!isConfirmed && <p className="cm-empty">Confirm your reviewed skills to unlock matching.</p>}
      {phase === 'matching' && <div className="cm-result-skel" aria-hidden="true">{[0, 1, 2].map(i => <i key={i} />)}</div>}
      {phase === 'matching-error' && <div className="match-error cm-err" role="alert" data-testid="error-matching">
        <span>{error}</span>
        <button type="button" className="btn btn-secondary btn-small" onClick={runMatch} data-testid="button-retry-matching"><RotateCcw size={11} /> Retry matching</button>
      </div>}
      {phase === 'results' && result && <>
        {result.matches.length === 0
          ? <div className="cm-empty-box" data-testid="match-empty"><strong>None of these skills appear in the dataset's role skill lists.</strong><span>Try adding more specific tools or methods from your experience.</span></div>
          : <ol className="cm-results" data-testid="list-career-matches">
            {result.matches.map((m, i) => {
              const open = openRole === m.roleFamily;
              return <li className="cm-result" key={m.roleFamily} data-testid={`match-${m.roleFamily}`}>
                <div className="cm-result-top">
                  <span className="cm-rank">{String(i + 1).padStart(2, '0')}</span>
                  <div className="cm-result-main">
                    <h4>{m.roleFamily}</h4>
                    <div className="cm-bar" role="img" aria-label={`${m.score}% skill overlap`}><i style={{ transform: `scaleX(${Math.min(m.score, 100) / 100})` }} /></div>
                    <small>{m.matchedSkills.length} of {m.skillsConsidered} listed skills matched</small>
                  </div>
                  <span className="match-pill" data-testid={`text-score-${i}`}>{m.score}%</span>
                </div>
                <button type="button" className="cm-toggle" aria-expanded={open} onClick={() => setOpenRole(open ? null : m.roleFamily)} data-testid={`button-details-${i}`}>
                  {open ? 'Hide' : 'Show'} skill details <ChevronDown size={12} className={open ? 'cm-rot' : ''} />
                </button>
                {open && <div className="cm-details">
                  <div><span className="cm-label">You have</span><div className="skill-chips">{m.matchedSkills.map(s => <span className="chip" key={s}>{s}</span>)}</div></div>
                  <div><span className="cm-label">To explore</span><div className="skill-chips">{m.missingSkills.map(s => <span className="chip gap" key={s}>{s}</span>)}</div></div>
                </div>}
              </li>;
            })}
          </ol>}
        {result.unrecognizedSkills.length > 0 && <p className="cm-note" data-testid="text-unrecognized">Not found in the dataset (not scored): {result.unrecognizedSkills.join(', ')}</p>}
        <div className="cm-source" data-testid="text-source">
          <strong>{result.scoring.label}.</strong> {result.scoring.formula}. {result.scoring.note}{' '}
          Source: {result.source.datasetName}, {result.source.publisher} ({result.source.license}). {result.source.geographyNote}{' '}
          This is skill overlap, not a probability of being hired.
          {result.source.urls[0] && <> <a href={result.source.urls[0]} target="_blank" rel="noreferrer" className="text-link">View dataset</a></>}
        </div>
      </>}
    </section>
  </div>;
}
