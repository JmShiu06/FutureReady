import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity, AlertTriangle, BarChart3, BriefcaseBusiness, ChevronRight, Compass, Route as RouteIcon, ShieldCheck, UserRound,
} from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { useCvSession } from '@/domain/cv-session';
import { audienceLabels } from '@/domain/demo-data';
import { selectableAudiences } from '@/domain/storage';
import type { Audience } from '@/domain/types';
import { AiDrawerProvider } from '@/components/ai-drawer';

export const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: Compass, key: 'dashboard' },
  { href: '/my-profile', label: 'My profile', icon: UserRound, key: 'my-profile' },
  { href: '/careers-and-jobs', label: 'Careers & jobs', icon: BriefcaseBusiness, key: 'careers-and-jobs' },
  { href: '/market-and-ai-impact', label: 'Market & AI impact', icon: BarChart3, key: 'market-and-ai-impact' },
  { href: '/learning-roadmap', label: 'Learning roadmap', icon: RouteIcon, key: 'learning-roadmap' },
] as const;

function pageTitle(location: string) {
  if (location.startsWith('/careers-and-jobs/roles/')) return ['Careers & jobs', 'Role detail'];
  if (location.startsWith('/careers-and-jobs/listings/')) return ['Careers & jobs', 'Listing detail'];
  if (location === '/team') return ['Dashboard', 'Team & cohort'];
  const item = mainNav.find(n => location === n.href || location.startsWith(`${n.href}/`));
  return item ? [item.label] : ['Not found'];
}

function activeKey(location: string) {
  if (location === '/team') return 'dashboard';
  return mainNav.find(n => location === n.href || location.startsWith(`${n.href}/`))?.key;
}

function AudienceSelect() {
  const { state, setAudience } = useWorkspace();
  return <label className="top-audience-wrap"><span>Viewing as</span>
    <select id="top" className="top-audience" value={state.audience} onChange={e => setAudience(e.target.value as Audience)} aria-label="Switch audience workspace" data-testid="select-audience-top">
      {selectableAudiences.map(a => <option key={a} value={a}>{audienceLabels[a]}</option>)}
    </select></label>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { state, profile, storageWarning } = useWorkspace();
  const { candidateName } = useCvSession();
  const crumbs = pageTitle(location);
  const current = activeKey(location);
  const displayName = candidateName || profile.occupation || 'Your profile';
  const initials = displayName.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  return <AiDrawerProvider><div className="app-shell">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand" data-testid="link-brand">
        <span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span>
        <span className="brand-name">FutureReady<span>Workforce intelligence</span></span>
      </Link>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {mainNav.map(item => {
          const Icon = item.icon;
          const active = item.key === current;
          return <Link key={item.key} href={item.href} data-testid={`link-nav-${item.key}`} aria-current={active ? 'page' : undefined} aria-label={item.label} className={`nav-link${active ? ' active' : ''}`}>
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{item.label}</span>
          </Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="profile-chip"><span className="avatar">{initials || 'FR'}</span><div><strong data-testid="text-shell-name">{displayName}</strong><span>{audienceLabels[state.audience]}</span></div></div>
      </div>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <div className="crumb"><span>FutureReady</span>{crumbs.map((c, i) => <span key={c} className="crumb-part"><ChevronRight size={12} />{i === crumbs.length - 1 ? <b data-testid="text-page-title">{c}</b> : <span>{c}</span>}</span>)}</div>
        <div className="top-actions"><AudienceSelect /></div>
      </header>
      <main className="main-content page-enter" key={location}>
        <div className="banner banner-demo" role="note" data-testid="banner-demo"><ShieldCheck size={14} /><span><strong>Demo workspace.</strong> Synthetic records and sample job listings are for exploration, not live vacancies. Official data is cited separately. Scores show illustrative skill coverage or overlap, not hiring predictions or forecasts.</span></div>
        {storageWarning && <div className="banner banner-warn" role="alert" data-testid="banner-storage"><AlertTriangle size={14} /><span>{storageWarning}</span></div>}
        {children}
      </main>
    </div>
  </div></AiDrawerProvider>;
}
