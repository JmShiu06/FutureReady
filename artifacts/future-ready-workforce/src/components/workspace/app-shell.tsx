import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AlertTriangle, BarChart3, BriefcaseBusiness, ChevronRight, Compass, FileSearch, Route as RouteIcon, ShieldCheck, UserRound,
} from 'lucide-react';
import { useWorkspace } from '@/domain/workspace-context';
import { useCvSession } from '@/domain/cv-session';
import { selectableAudiences } from '@/domain/storage';
import type { Audience } from '@/domain/types';
import { AiDrawerProvider } from '@/components/ai-drawer';
import { LanguageSwitcher, useI18n } from '@/i18n/i18n-context';
import type { MessageKey } from '@/i18n/messages';
import { RaccoonArt } from '@/components/brand/raccoon-art';
import '@/components/ai-model-label.css';

export const mainNav = [
  { href: '/dashboard', label: 'nav.dashboard', icon: Compass, key: 'dashboard' },
  { href: '/my-profile', label: 'nav.profile', icon: UserRound, key: 'my-profile' },
  { href: '/careers-and-jobs', label: 'nav.careers', icon: BriefcaseBusiness, key: 'careers-and-jobs' },
  { href: '/market-and-ai-impact', label: 'nav.market', icon: BarChart3, key: 'market-and-ai-impact' },
  { href: '/learning-roadmap', label: 'nav.roadmap', icon: RouteIcon, key: 'learning-roadmap' },
] as const;

function pageTitle(location: string): MessageKey[] {
  if (location.startsWith('/careers-and-jobs/roles/')) return ['nav.careers', 'crumb.roleDetail'];
  if (location.startsWith('/careers-and-jobs/listings/')) return ['nav.careers', 'crumb.listingDetail'];
  if (location === '/team') return ['nav.dashboard', 'crumb.team'];
  if (location === '/ai-disclosure') return ['ai.link'];
  const item = mainNav.find(n => location === n.href || location.startsWith(`${n.href}/`));
  return item ? [item.label] : ['crumb.notFound'];
}

function activeKey(location: string) {
  if (location === '/team') return 'dashboard';
  return mainNav.find(n => location === n.href || location.startsWith(`${n.href}/`))?.key;
}

function AudienceSelect() {
  const { state, setAudience } = useWorkspace();
  const { t } = useI18n();
  return <label className="top-audience-wrap"><span>{t('shell.viewingAs')}</span>
    <select id="top" className="top-audience" value={state.audience} onChange={e => setAudience(e.target.value as Audience)} aria-label={t('shell.switchAudience')} data-testid="select-audience-top">
      {selectableAudiences.map(a => <option key={a} value={a}>{t(`audience.${a}`)}</option>)}
    </select></label>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { state, storageWarning } = useWorkspace();
  const { candidateName, phase } = useCvSession();
  const { t, sessionOnly } = useI18n();
  const crumbs = pageTitle(location).map(k => t(k));
  const current = activeKey(location);
  const displayName = phase === 'ready' ? candidateName || t('shell.unknown') : t('shell.yourProfile');
  const initials = displayName.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  return <AiDrawerProvider><div className="app-shell">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand" data-testid="link-brand">
        <RaccoonArt name="logo" size={40} alt={t('shell.logoAlt')} className="brand-logo" testId="img-brand-logo" />
        <span className="brand-name">FutureReady<span>{t('app.tagline')}</span></span>
      </Link>
      <div className="nav-caption">{t('nav.caption')}</div>
      <nav className="nav-list" aria-label={t('nav.main')}>
        {mainNav.map(item => {
          const Icon = item.icon;
          const active = item.key === current;
          return <Link key={item.key} href={item.href} data-testid={`link-nav-${item.key}`} aria-current={active ? 'page' : undefined} aria-label={t(item.label)} className={`nav-link${active ? ' active' : ''}`}>
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{t(item.label)}</span>
          </Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <Link href="/ai-disclosure" className="sidebar-ai-link" aria-current={location === '/ai-disclosure' ? 'page' : undefined} aria-label={t('ai.linkAria')} data-testid="link-ai-disclosure-sidebar"><FileSearch size={14} aria-hidden="true" /><span>{t('ai.link')}</span></Link>
        <div className="profile-chip"><span className="avatar">{initials || 'FR'}</span><div><strong data-testid="text-shell-name">{displayName}</strong><span>{t(`audience.${state.audience}`)}</span></div></div>
      </div>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <div className="crumb"><span>FutureReady</span>{crumbs.map((c, i) => <span key={c} className="crumb-part"><ChevronRight size={12} />{i === crumbs.length - 1 ? <b data-testid="text-page-title">{c}</b> : <span>{c}</span>}</span>)}</div>
        <div className="top-actions"><Link href="/ai-disclosure" className="top-ai-link" aria-label={t('ai.linkAria')} title={t('ai.link')} data-testid="link-ai-disclosure-mobile"><FileSearch size={15} aria-hidden="true" /></Link><LanguageSwitcher /><AudienceSelect /></div>
      </header>
      <main className="main-content page-enter" key={location}>
        <div className="banner banner-demo" role="note" data-testid="banner-demo"><ShieldCheck size={14} /><span><strong>{t('banner.demoTitle')}</strong> {t('banner.demoBody')}</span></div>
        {sessionOnly && <div className="banner banner-warn" role="status" data-testid="banner-language-session"><AlertTriangle size={14} /><span>{t('lang.sessionOnly')}</span></div>}
        {storageWarning && <div className="banner banner-warn" role="alert" data-testid="banner-storage"><AlertTriangle size={14} /><span>{storageWarning}</span></div>}
        {children}
      </main>
    </div>
  </div></AiDrawerProvider>;
}
