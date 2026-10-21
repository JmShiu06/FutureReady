import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity, AlertTriangle, BarChart3, BriefcaseBusiness, ChevronRight, Compass, FileText,
  Globe2, Map, Radar, ShieldCheck, UserRound, Users,
} from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { audienceLabels } from '@/domain/demo-data';
import { audiences } from '@/domain/storage';
import type { Audience } from '@/domain/types';

const nav = [
  { href: '/', label: 'Overview', icon: Compass, key: 'home' },
  { href: '/profile', label: 'My profile', icon: UserRound, key: 'profile' },
  { href: '/careers', label: 'Career explorer', icon: Map, key: 'careers' },
  { href: '/cv-analysis', label: 'CV recommendations', icon: FileText, key: 'cv-analysis' },
  { href: '/trends', label: 'Skills radar', icon: Radar, key: 'trends' },
  { href: '/scenarios', label: 'AI scenarios', icon: BarChart3, key: 'scenarios' },
  { href: '/sdgs', label: 'SDG explorer', icon: Globe2, key: 'sdgs' },
  { href: '/team', label: 'Team & cohort', icon: Users, key: 'team' },
  { href: '/jobs', label: 'Job search', icon: BriefcaseBusiness, key: 'jobs' },
];
const titles: Record<string, string> = { '/roles': 'Role detail', '/jobs/': 'Job details' };

function AudienceSelect({ className, id }: { className: string; id: string }) {
  const { state, setAudience } = useWorkspace();
  return <select id={id} className={className} value={state.audience} onChange={e => setAudience(e.target.value as Audience)} aria-label="Switch audience workspace" data-testid={`select-audience-${id}`}>
    {audiences.map(a => <option key={a} value={a}>{audienceLabels[a]}</option>)}
  </select>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { state, profile, storageWarning } = useWorkspace();
  const audienceNav = nav.filter(item => item.key !== 'team' || state.audience === 'hr' || state.audience === 'education');
  const current = audienceNav.find(n => n.href === '/' ? location === '/' : location === n.href || location.startsWith(`${n.href}/`));
  const page = location.startsWith('/roles/') ? titles['/roles'] : location.startsWith('/jobs/') ? titles['/jobs/'] : current?.label ?? 'Not found';
  const initials = profile.occupation.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-brand">
        <span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span>
        <span className="brand-name">FutureReady<span>Workforce intelligence</span></span>
      </Link>
      <div className="audience-switch"><label htmlFor="side">Viewing as</label><AudienceSelect id="side" className="" /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {audienceNav.map(item => {
          const Icon = item.icon;
          const active = item === current;
          return <Link key={item.key} href={item.href} data-testid={`link-nav-${item.key}`} aria-current={active ? 'page' : undefined} className={`nav-link${active ? ' active' : ''}`}>
            <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
          </Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-note"><strong><ShieldCheck size={14} /> DEMO DATA ONLY</strong>
          <p>Planning examples are fictional. CVs are processed transiently; only profile details and skills you review and apply can be saved in your browser profile.</p></div>
        <div className="profile-chip"><span className="avatar">{initials || 'FR'}</span><div><strong data-testid="text-shell-occupation">{profile.occupation || 'Your profile'}</strong><span>{audienceLabels[state.audience]}</span></div></div>
      </div>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <div className="crumb"><span>FutureReady</span><ChevronRight size={12} /><b data-testid="text-page-title">{page}</b></div>
        <div className="top-actions"><span><i className="live-dot" />Demo mode</span><AudienceSelect id="top" className="top-audience" /></div>
      </header>
      <main className="main-content page-enter" key={location}>
        <div className="banner banner-demo" role="note" data-testid="banner-demo"><ShieldCheck size={14} /><span><strong>Demo workspace.</strong> Synthetic records for exploration only — scores are illustrative skill coverage, not hiring predictions or forecasts.</span></div>
        {storageWarning && <div className="banner banner-warn" role="alert" data-testid="banner-storage"><AlertTriangle size={14} /><span>{storageWarning}</span></div>}
        {children}
      </main>
    </div>
  </div>;
}
