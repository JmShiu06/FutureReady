import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { generateCvCareerExplanation, type CvCareerExplanation } from '@workspace/api-client-react';
import { useWorkspace } from './workspace-context';

export function savedSkillNames(skills: readonly { name: string }[]): string[] {
  return [...new Set(skills.map(skill => skill.name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))].sort();
}

type Session = {
  key: string; selected: string[]; consent: boolean;
  phase: 'idle' | 'loading' | 'done' | 'error';
  explanation: CvCareerExplanation | null; error: string;
};
type Value = {
  names: string[]; selected: string[]; consent: boolean;
  explainPhase: Session['phase']; explanation: CvCareerExplanation | null; explainError: string;
  toggleSkill(name: string): void; setConsent(value: boolean): void;
  requestExplanation(): void; clear(): void;
};
const Context = createContext<Value | null>(null);

/** In-memory analysis of saved skill names; independent of uploads and CV drafts. */
export function SkillAnalysisProvider({ children }: { children: ReactNode }) {
  const { profile, state } = useWorkspace();
  const names = savedSkillNames(profile.skills);
  const key = JSON.stringify([state.audience, profile.id, names]);
  const fresh = (): Session => ({ key, selected: names.slice(0, 50), consent: false, phase: 'idle', explanation: null, error: '' });
  const [session, setSession] = useState<Session>(fresh);
  const current = session.key === key ? session : fresh();
  const latestKey = useRef(key);
  latestKey.current = key;
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    pending.current?.abort(); pending.current = null;
    setSession(fresh());
    return () => { pending.current?.abort(); };
    // The key contains audience, profile identity and the complete saved name set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const clear = () => {
    pending.current?.abort(); pending.current = null;
    setSession(fresh());
  };
  const value: Value = {
    names, selected: current.selected, consent: current.consent,
    explainPhase: current.phase, explanation: current.explanation, explainError: current.error,
    clear,
    setConsent: consent => {
      if (!consent) { pending.current?.abort(); pending.current = null; }
      setSession({ ...current, consent, ...(consent ? {} : { explanation: null, phase: 'idle', error: '' }) });
    },
    toggleSkill: name => {
      if (!names.includes(name)) return;
      pending.current?.abort(); pending.current = null;
      const selected = current.selected.includes(name) ? current.selected.filter(skill => skill !== name) : [...current.selected, name].slice(0, 50);
      setSession({ ...fresh(), selected });
    },
    requestExplanation: () => {
      if (!current.consent || !current.selected.length || current.phase === 'loading') return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setSession({ ...current, phase: 'loading', explanation: null, error: '' });
      let timedOut = false;
      const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 90_000);
      generateCvCareerExplanation({
        source: 'profile-skills', consent: true,
        data: { skills: [...current.selected], languages: [], extractionLimited: false },
      }, { signal: controller.signal }).then(explanation => {
        if (!controller.signal.aborted && latestKey.current === key && pending.current === controller) {
          setSession({ ...current, explanation, phase: 'done', error: '' });
        }
      }).catch(error => {
        if (latestKey.current !== key || pending.current !== controller || (controller.signal.aborted && !timedOut)) return;
        const message = (error as { data?: { error?: unknown } })?.data?.error;
        setSession({ ...current, phase: 'error', explanation: null, error: timedOut
          ? 'Skill analysis timed out. Your saved skills are unchanged.'
          : typeof message === 'string' ? message : 'Skill analysis is unavailable. Your saved skills are unchanged.' });
      }).finally(() => {
        window.clearTimeout(timer);
        if (pending.current === controller) pending.current = null;
      });
    },
  };
  return createElement(Context.Provider, { value }, children);
}

export function useSkillAnalysis() {
  const value = useContext(Context);
  if (!value) throw new Error('SkillAnalysisProvider is required.');
  return value;
}
