import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { generateCvCareerExplanation, type CvAiSkillData, type CvCareerExplanation, type CvSkillExtraction } from '@workspace/api-client-react';
import { useWorkspace } from './workspace-context';
import { buildCvAiPayload as buildPayload, recognizeCvLanguageNames } from './cv-ai-payload';
export { buildPayload };

/**
 * Transient CV session. Lives only in memory: never written to localStorage.
 * Cleared on every new upload, on audience switch and on explicit discard.
 */
export type CvListField = 'languages' | 'certifications';
export interface DraftItem { id: number; text: string; include: boolean }
export interface CvDraft {
  skills: DraftItem[];
  languages: DraftItem[];
  certifications: DraftItem[];
  extractionLimited: boolean;
  categories: Record<string, string>;
}
type Phase = 'idle' | 'extracting' | 'ready' | 'error';
type ExplainPhase = 'idle' | 'loading' | 'done' | 'error';
interface CvSessionValue {
  phase: Phase; uploadError: string; draft: CvDraft | null; warnings: string[]; candidateName: string;
  explainPhase: ExplainPhase; explanation: CvCareerExplanation | null; explainError: string; consent: boolean;
  beginUpload(): { signal: AbortSignal; id: number };
  completeUpload(id: number, result: CvSkillExtraction): boolean;
  failUpload(id: number, message: string): void;
  updateItem(field: keyof Omit<CvDraft, 'extractionLimited' | 'categories'>, id: number, patch: Partial<Omit<DraftItem, 'id'>>): void;
  setConsent(value: boolean): void;
  requestExplanation(): void;
  clear(): void;
  payload: CvAiSkillData | null;
}
const CvSessionContext = createContext<CvSessionValue | null>(null);
let seq = 0;
const EXPLAIN_TIMEOUT_MS = 90_000;
const toItems = (list: string[] | undefined) => (list ?? []).map(text => ({ id: ++seq, text, include: true }));

function errorMessage(error: unknown, fallback: string) {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === 'string' ? data.error : fallback;
}

export function CvSessionProvider({ children }: { children: ReactNode }) {
  const { state } = useWorkspace();
  const [phase, setPhase] = useState<Phase>('idle');
  const [uploadError, setUploadError] = useState('');
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [explainPhase, setExplainPhase] = useState<ExplainPhase>('idle');
  const [explanation, setExplanation] = useState<CvCareerExplanation | null>(null);
  const [explainError, setExplainError] = useState('');
  const [consent, setConsentState] = useState(false);
  const uploadRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const explainRef = useRef<AbortController | null>(null);
  const uploadId = useRef(0);

  const resetAll = useCallback(() => {
    uploadRef.current?.controller.abort(); uploadRef.current = null;
    explainRef.current?.abort(); explainRef.current = null;
    uploadId.current += 1;
    setPhase('idle'); setUploadError(''); setDraft(null); setCandidateName(''); setWarnings([]);
    setExplainPhase('idle'); setExplanation(null); setExplainError(''); setConsentState(false);
  }, []);

  // Each audience keeps its own profile: never carry CV details across audiences.
  useEffect(() => { resetAll(); }, [state.audience, resetAll]);
  useEffect(() => () => { uploadRef.current?.controller.abort(); explainRef.current?.abort(); }, []);

  const invalidateExplanation = () => {
    explainRef.current?.abort(); explainRef.current = null;
    setExplainPhase('idle'); setExplanation(null); setExplainError(''); setConsentState(false);
  };

  const value: CvSessionValue = {
    phase, uploadError, draft, warnings, candidateName, explainPhase, explanation, explainError, consent,
    payload: useMemo(() => draft ? buildPayload(draft) : null, [draft]),
    beginUpload: () => {
      resetAll();
      const id = uploadId.current;
      const controller = new AbortController();
      uploadRef.current = { id, controller };
      setPhase('extracting');
      return { signal: controller.signal, id };
    },
    completeUpload: (id, result) => {
      if (uploadRef.current?.id !== id || id !== uploadId.current) return false;
      uploadRef.current = null;
      const data = result.careerData;
      setCandidateName(result.detectedName?.trim() || 'Unknown');
      const categories: Record<string, string> = {};
      for (const c of result.categorizedSkills ?? []) categories[c.name.trim().toLowerCase()] = c.category;
      setDraft({
        skills: toItems(data?.skills ?? result.skills),
        languages: toItems(recognizeCvLanguageNames(data?.languages ?? [])),
        certifications: toItems(data?.certifications ?? []),
        extractionLimited: data?.extractionLimited ?? true, categories,
      });
      setWarnings(result.warnings);
      setPhase('ready');
      return true;
    },
    failUpload: (id, message) => {
      if (id !== uploadId.current) return;
      uploadRef.current = null;
      setDraft(null); setCandidateName(''); setWarnings([]);
      setUploadError(message); setPhase('error');
    },
    updateItem: (field, id, patch) => {
      invalidateExplanation();
      setDraft(d => d ? { ...d, [field]: d[field].map(i => i.id === id ? { ...i, ...patch } : i) } : d);
    },
    setConsent: v => setConsentState(v),
    requestExplanation: () => {
      if (!draft || !consent) return;
      const data = buildPayload(draft);
      if (!data.skills.length) return;
      explainRef.current?.abort();
      const controller = new AbortController();
      explainRef.current = controller;
      const forUpload = uploadId.current;
      let timedOut = false;
      const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, EXPLAIN_TIMEOUT_MS);
      setExplainPhase('loading'); setExplainError(''); setExplanation(null);
      generateCvCareerExplanation({ data, consent: true }, { signal: controller.signal })
        .then(result => {
          if (controller.signal.aborted || forUpload !== uploadId.current) return;
          setExplanation(result); setExplainPhase('done');
        })
        .catch(error => {
          if (timedOut && forUpload === uploadId.current && explainRef.current === controller) {
            setExplainError('The AI career explanation took longer than 90 seconds and was stopped. Nothing was saved. Try again.');
            setExplainPhase('error');
            return;
          }
          if (controller.signal.aborted || forUpload !== uploadId.current) return;
          setExplainError(errorMessage(error, 'The AI career explanation could not be generated. Your CV details were not saved. Try again.'));
          setExplainPhase('error');
        })
        .finally(() => { window.clearTimeout(timer); if (explainRef.current === controller) explainRef.current = null; });
    },
    clear: resetAll,
  };
  return <CvSessionContext.Provider value={value}>{children}</CvSessionContext.Provider>;
}

export function useCvSession() {
  const context = useContext(CvSessionContext);
  if (!context) throw new Error('CvSessionProvider is missing.');
  return context;
}
