import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Sparkles, X } from 'lucide-react';
import type { AiExplanationInput } from '@workspace/api-client-react';
import { AiExplanationPanel, aiFeatureTitles } from '@/components/ai-explanation-panel';
import { useWorkspace } from '@/domain/workspace-context';
import { AiModelLabel } from '@/components/ai-model-label';
import type { ProfileSkill } from '@/domain/types';

export type AiRequest = {
  feature: AiExplanationInput['feature'];
  jobId?: string;
  goal?: number;
  cvDetectedSkill?: string;
  onApplySkills?: (skills: ProfileSkill[]) => string | undefined;
  onClose?: () => void;
};

type Ctx = { open: (request: AiRequest) => void; close: () => void };
const AiDrawerContext = createContext<Ctx | null>(null);

export function useAiDrawer() {
  const ctx = useContext(AiDrawerContext);
  if (!ctx) throw new Error('useAiDrawer must be used inside AiDrawerProvider');
  return ctx;
}

const focusableSelector = 'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** One drawer hosted by the app shell. Content is the existing synthetic-only explanation panel. */
export function AiDrawerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<AiRequest | null>(null);
  const [nonce, setNonce] = useState(0);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const search = useSearch();
  const { state } = useWorkspace();

  const close = useCallback(() => {
    const closedRequest = request;
    setRequest(null);
    const target = returnFocus.current;
    returnFocus.current = null;
    requestAnimationFrame(() => {
      if (target && document.contains(target)) target.focus();
      closedRequest?.onClose?.();
    });
  }, [request]);
  const open = useCallback((next: AiRequest) => {
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    setRequest(next);
    setNonce(n => n + 1);
  }, []);

  // Navigation or an audience switch closes the drawer; unmounting the panel aborts any in-flight request.
  useEffect(() => { setRequest(null); returnFocus.current = null; }, [location, search, state.audience]);

  useEffect(() => {
    if (!request) return;
    const node = dialogRef.current;
    requestAnimationFrame(() => node?.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [request]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)].filter(el => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return <AiDrawerContext.Provider value={{ open, close }}>
    {children}
    {request && <div className="ai-drawer-root">
      <div className="ai-drawer-scrim" onClick={close} aria-hidden="true" data-testid="ai-drawer-scrim" />
      <div ref={dialogRef} className="ai-drawer" role="dialog" aria-modal="true" aria-labelledby="ai-drawer-title" onKeyDown={onKeyDown} data-testid="drawer-ai">
        <header className="ai-drawer-head">
          <div>
            <div className="eyebrow">Explain with AI</div>
            <h2 id="ai-drawer-title"><Sparkles size={16} aria-hidden="true" /> {aiFeatureTitles[request.feature]}</h2>
          </div>
          <button type="button" className="icon-button" onClick={close} aria-label="Close AI explanation" data-autofocus data-testid="button-close-ai-drawer"><X size={16} /></button>
        </header>
        <div className="ai-drawer-body">
          <AiModelLabel testId="label-ai-model-drawer" />
          <AiExplanationPanel key={nonce} embedded feature={request.feature} jobId={request.jobId} goal={request.goal} cvDetectedSkill={request.cvDetectedSkill} onApplySkills={request.onApplySkills} />
        </div>
      </div>
    </div>}
  </AiDrawerContext.Provider>;
}

/** Feature trigger. Selects feature / job / goal only; the drawer owns the request lifecycle. */
export function AiExplainButton({ request, label = 'Explain with AI', testId, small = false, quiet = false }: {
  request: AiRequest; label?: string; testId?: string; small?: boolean; quiet?: boolean;
}) {
  const { open } = useAiDrawer();
  if (request.feature !== 'cv-analysis' && request.feature !== 'market-trends') {
    return null;
  }
  return <span className="ai-trigger-wrap"><button type="button" className={`btn ai-trigger ${quiet ? 'btn-quiet' : 'btn-secondary'}${small ? ' btn-small' : ''}`} aria-haspopup="dialog"
    onClick={() => open(request)} data-testid={testId ?? `button-open-ai-${request.feature}`}>
    <Sparkles size={small ? 12 : 14} aria-hidden="true" /> {label}
  </button><AiModelLabel compact testId={`label-ai-model-button-${request.feature}`} /></span>;
}
