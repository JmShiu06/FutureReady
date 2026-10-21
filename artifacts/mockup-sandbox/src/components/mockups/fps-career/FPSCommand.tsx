import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Activity, ArrowDownRight, ArrowRight, BarChart3, BookOpen, BriefcaseBusiness, Check, ChevronRight, CircleHelp, Compass, Crosshair, FileText, Flag, GraduationCap, Layers3, LockKeyhole, Plus, Radar, ShieldCheck, Sparkles, Target, TrendingUp, Users, X } from 'lucide-react';
import './_group.css';
import './FPSCommand.css';

type Skill = { name: string; level: number; trend: string; category: string };
type Role = { name: string; family: string; skills: string[]; summary: string; learning: string[] };

const starterSkills: Skill[] = [
  { name: 'Project coordination', level: 4, trend: '+12%', category: 'Operations' },
  { name: 'Customer research', level: 3, trend: '+18%', category: 'People & insight' },
  { name: 'Data storytelling', level: 2, trend: '+24%', category: 'Digital' },
  { name: 'Process improvement', level: 4, trend: '+9%', category: 'Operations' },
];
const skillOptions = ['Service blueprinting', 'Facilitation', 'Workforce planning', 'Learning design', 'Digital fluency', 'Excel', 'AI literacy'];
const roleData: Role[] = [
  { name: 'Service designer', family: 'DESIGN / CX', skills: ['Customer research', 'Project coordination', 'Facilitation', 'Service blueprinting', 'Data storytelling', 'Workshop design', 'Journey mapping'], summary: 'Shape better services by connecting customer needs with the systems and teams behind them.', learning: ['Service blueprinting', 'Facilitation', 'Journey mapping'] },
  { name: 'Customer insights analyst', family: 'RESEARCH / DATA', skills: ['Customer research', 'Data storytelling', 'Excel', 'SQL', 'Survey design', 'Data visualization', 'Statistics'], summary: 'Turn customer evidence into clear recommendations that help teams decide what to do next.', learning: ['Excel', 'Data visualization', 'Survey design'] },
  { name: 'Operations improvement lead', family: 'OPERATIONS', skills: ['Process improvement', 'Project coordination', 'Facilitation', 'Change management', 'Lean methods', 'Data storytelling', 'Workforce planning'], summary: 'Find friction in everyday work and help teams test practical, lasting improvements.', learning: ['Facilitation', 'Workforce planning', 'Change management'] },
  { name: 'Learning experience designer', family: 'PEOPLE / LEARNING', skills: ['Project coordination', 'Learning design', 'Facilitation', 'Customer research', 'Digital fluency', 'Content design', 'Evaluation'], summary: 'Design learning that meets people where they are and helps new skills stick.', learning: ['Learning design', 'Digital fluency', 'Evaluation'] },
];
const levelCopy = ['New to it', 'Exploring', 'Working knowledge', 'Confident', 'Can coach'];
const levelLabel = (n: number) => levelCopy[n - 1] || levelCopy[2];

export function FPSCommand() {
  const [skills, setSkills] = useState(starterSkills);
  const [view, setView] = useState('briefing');
  const [detail, setDetail] = useState<Role | null>(null);
  const [adding, setAdding] = useState(false);
  const [cvName, setCvName] = useState('');
  const [cvMessage, setCvMessage] = useState('');
  const availableSkills = skillOptions.filter(name => !skills.some(skill => skill.name === name));
  const matches = useMemo(() => roleData.map(role => {
    const matched = role.skills.filter(name => skills.some(skill => skill.name.toLowerCase() === name.toLowerCase()));
    const missing = role.skills.filter(name => !matched.includes(name));
    return { ...role, matched, missing, score: Math.round(matched.length / 30 * 100) };
  }).sort((a, b) => b.matched.length - a.matched.length), [skills]);

  useEffect(() => {
    if (!detail) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = document.querySelector<HTMLElement>('.fps-detail');
    const focusable = () => panel?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [];
    panel?.querySelector<HTMLElement>('.fps-close')?.focus();
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetail(null);
        return;
      }
      if (event.key === 'Tab') {
        const elements = focusable();
        if (!elements.length) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeys);
    return () => {
      document.removeEventListener('keydown', handleKeys);
      returnFocus?.focus();
    };
  }, [detail]);

  const addSkill = (name: string) => {
    if (!name) return;
    setSkills(current => [...current, { name, level: 2, trend: 'Sample', category: 'Emerging' }]);
    setAdding(false);
  };
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCvName(file.name);
      setCvMessage('Selected on this device only. No upload or CV analysis happens here; add skills manually.');
    }
  };
  const navItems = [
    { id: 'briefing', label: 'Career briefing', icon: Compass, code: '01' },
    { id: 'loadout', label: 'Skills loadout', icon: Layers3, code: '02' },
    { id: 'intel', label: 'Market intel', icon: Radar, code: '03' },
    { id: 'plan', label: 'Learning plan', icon: BookOpen, code: '04' },
  ];
  const pageTitle = navItems.find(item => item.id === view)?.label ?? 'Career briefing';

  return <div className="fps-root">
    <div className="fps-grain" aria-hidden="true" />
    <aside className="fps-rail">
      <div className="fps-brand" aria-label="FutureReady Workforce">
        <span className="fps-brand-mark"><Crosshair size={20} strokeWidth={2.2} /></span>
        <span className="fps-brand-copy">FUTUREREADY<small>WORKFORCE INTELLIGENCE</small></span>
      </div>
      <div className="fps-rail-label">COMMAND DECK <span>•</span></div>
      <nav className="fps-nav" aria-label="Workspace navigation">
        {navItems.map(({ id, label, icon: Icon, code }) => <button key={id} className={`fps-nav-item${view === id ? ' is-active' : ''}`} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined} data-testid={`nav-${id}`}>
          <span className="fps-nav-icon"><Icon size={17} /></span><span>{label}</span><small>{code}</small>
        </button>)}
      </nav>
      <div className="fps-rail-bottom">
        <div className="fps-protocol"><span className="fps-protocol-head"><ShieldCheck size={13} /> DEMO PROTOCOL</span><p>Illustrative dataset only. No live vacancy feed. Your profile stays in this preview.</p></div>
        <div className="fps-user"><span className="fps-avatar">AL</span><span><b>Alex Lee</b><small>CAREER EXPLORER</small></span><span className="fps-user-state" aria-label="Profile ready" /></div>
      </div>
    </aside>

    <main className="fps-main">
      <header className="fps-topbar">
        <div className="fps-breadcrumb"><span>WORKSPACE</span><ChevronRight size={13} /><b>{pageTitle.toUpperCase()}</b></div>
        <div className="fps-status"><i /> SAMPLE ENVIRONMENT <span className="fps-status-divider" /> <span>PROFILE SYNC: LOCAL</span><button aria-label="About this demo" className="fps-help" onClick={() => setDetail({ ...roleData[0], name: 'About this workspace', summary: 'FutureReady is a personal career intelligence workspace: understand your skills, explore adjacent roles, and plan learning. This is a local visual demo.', learning: ['Edit skill levels', 'Explore role overlap', 'Choose a learning next step'] })}><CircleHelp size={16} /></button></div>
      </header>

      <div className="fps-content">
        <div className="fps-page-heading">
          <div><div className="fps-eyebrow"><span className="fps-eyebrow-line" /> FIELD BRIEFING <span className="fps-eyebrow-muted">/ 18 JUN · PERSONAL WORKSPACE</span></div>
            <h1>{view === 'briefing' ? <>Your next move,<br /><em>in clear sight.</em></> : <>{pageTitle}<br /><em>your next advantage.</em></>}</h1>
            <p className="fps-deck">{view === 'briefing' ? 'Your experience already travels. Map the skills you carry to roles you could grow into.' : view === 'loadout' ? 'Tune your current skill profile. Your changes update the role overlap preview immediately.' : view === 'intel' ? 'A small set of illustrative signals to help you think about skills in motion.' : 'Build a practical next-step plan around the capabilities you want to grow.'}</p>
          </div>
          <button className="fps-cv-button" onClick={() => document.getElementById('fps-cv-input')?.click()}><FileText size={15} /> <span>Add a CV<small>Local picker only</small></span><ArrowDownRight size={14} /></button>
        </div>

        {view === 'briefing' && <>
          <section className="fps-overview">
            <div className="fps-mission">
              <div className="fps-mission-top"><span><Target size={14} /> CURRENT OBJECTIVE</span><span className="fps-index">MISSION 01 / 04</span></div>
              <div className="fps-mission-body">
                <div><div className="fps-micro">CAREER INTELLIGENCE // PERSONAL</div><h2>Find the overlap.<br />Choose your direction.</h2><p>Discover adjacent roles from skills you already use, then see what could bring the next move within reach.</p>
                  <button className="fps-action-primary" onClick={() => document.getElementById('fps-role-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Crosshair size={15} /> SCAN ROLE MATCHES <ArrowRight size={14} /></button>
                </div>
                <div className="fps-reticle" aria-hidden="true"><span className="fps-reticle-ring" /><span className="fps-reticle-core" /><i className="reticle-tick t1" /><i className="reticle-tick t2" /><i className="reticle-tick t3" /><i className="reticle-tick t4" /><b>FR / 01</b></div>
              </div>
              <div className="fps-mission-foot"><span><i /> PROFILE READY</span><span>NO LIVE VACANCIES</span><span>LOCAL SESSION</span></div>
            </div>
            <div className="fps-overlap-card">
              <div className="fps-card-label">TOP DATASET OVERLAP <Target size={15} /></div>
              <div className="fps-overlap-number">{matches[0]?.matched.length ?? 0}<small>SKILLS</small></div>
              <div className="fps-overlap-role">{matches[0]?.name ?? 'Add skills to begin'}</div>
              <div className="fps-overlap-foot"><span className="fps-overlap-mark" /> {matches[0]?.score ?? 0}% formula score <span className="fps-foot-info">/ NOT A HIRING PROBABILITY</span></div>
              <div className="fps-overlap-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="fps-count-row"><span>{skills.length.toString().padStart(2, '0')} PROFILE SKILLS</span><span>30 SKILLS CONSIDERED</span></div>
            </div>
          </section>
          <section className="fps-dashboard-grid" id="fps-role-board">
            <div className="fps-panel fps-role-panel">
              <div className="fps-section-heading"><div><div className="fps-micro">ROLE RADAR / DATASET SCAN</div><h2>Adjacent role families</h2></div><span className="fps-result-count">04 OPTIONS <Radar size={14} /></span></div>
              <p className="fps-section-intro">Sorted by matched skills in the demo dataset. Select a role to inspect matched and missing skills.</p>
              <div className="fps-role-list">{matches.map((role, index) => <button key={role.name} className={`fps-role-row${index === 0 ? ' is-leading' : ''}`} onClick={() => setDetail(role)} data-testid={`role-${role.name.toLowerCase().replaceAll(' ', '-')}`}>
                <span className="fps-role-rank">0{index + 1}</span><span className="fps-role-main"><span className="fps-role-category">{role.family}</span><b>{role.name}</b><small>{role.matched.length} of {role.skills.length} listed skills overlap</small></span>
                <span className="fps-role-meter"><i style={{ width: `${Math.max(8, role.matched.length / role.skills.length * 100)}%` }} /></span>
                <span className="fps-role-match"><b>{role.matched.length}</b><small>MATCHED</small></span><ChevronRight size={16} className="fps-role-chevron" />
              </button>)}</div>
              <div className="fps-data-foot"><InfoMark /> Dataset skill overlap is a comparison signal, not a probability of getting a job. This is not a live vacancy feed.</div>
            </div>
            <div className="fps-panel fps-intel-panel">
              <div className="fps-section-heading"><div><div className="fps-micro">SIGNALS / ILLUSTRATIVE</div><h2>Skills in motion</h2></div><TrendingUp size={15} /></div>
              <div className="fps-signal-stack">
                <div className="fps-signal"><span className="fps-signal-icon"><BarChart3 size={15} /></span><span><b>Data storytelling</b><small>Appearing across more teams</small></span><strong>+24%</strong></div>
                <div className="fps-signal"><span className="fps-signal-icon"><Users size={15} /></span><span><b>Customer research</b><small>Human insight stays valuable</small></span><strong>+18%</strong></div>
                <div className="fps-signal"><span className="fps-signal-icon"><Sparkles size={15} /></span><span><b>AI literacy</b><small>Emerging baseline capability</small></span><strong>NEW</strong></div>
              </div>
              <div className="fps-intel-note"><LockKeyhole size={13} /><span><b>Demo signal set</b><br />Synthetic examples, not sourced from live labor-market data.</span></div>
              <button className="fps-text-action" onClick={() => setView('intel')}>OPEN FULL INTEL BRIEF <ArrowRight size={13} /></button>
            </div>
          </section>
          <section className="fps-lower-grid">
            <SkillLoadout skills={skills} setSkills={setSkills} adding={adding} setAdding={setAdding} available={availableSkills} addSkill={addSkill} />
            <LearningCard onOpen={() => setDetail({ ...matches[0], name: 'Your learning path' })} />
          </section>
        </>}

        {view === 'loadout' && <section className="fps-single-view"><SkillLoadout skills={skills} setSkills={setSkills} adding={adding} setAdding={setAdding} available={availableSkills} addSkill={addSkill} /><div className="fps-panel fps-loadout-aside"><div className="fps-micro">PROFILE READOUT</div><h2>{skills.length} skills in your loadout</h2><p>Adjust the level that feels closest to your experience. The score is based on what appears in role skill lists, not a judgment of your ability.</p><div className="fps-next-call"><Flag size={16} /> <span><b>Next useful move</b><small>Pick one missing skill from a role you want to explore.</small></span></div></div></section>}
        {view === 'intel' && <section className="fps-panel fps-brief-view"><div className="fps-section-heading"><div><div className="fps-micro">FIELD INTEL / SAMPLE SIGNALS</div><h2>What the sample dataset suggests</h2></div><Radar size={17} /></div><p className="fps-section-intro">These are illustrative examples for exploration, not a forecast or live market feed.</p>{[['Data storytelling','+24%','Appearing across more teams'],['Customer research','+18%','Human insight stays valuable'],['Project coordination','+12%','A connector skill across teams'],['Process improvement','+9%','A durable operations capability'],['AI literacy','EMERGING','An example of a shifting baseline']].map(([name, trend, note]) => <div className="fps-intel-row" key={name}><span className="fps-intel-code">SIG / {String(['Data storytelling','Customer research','Project coordination','Process improvement','AI literacy'].indexOf(name) + 1).padStart(2, '0')}</span><b>{name}</b><span>{note}</span><strong>{trend}</strong></div>)}<div className="fps-data-foot"><InfoMark /> Synthetic market signals. No live labor-market data is connected to this preview.</div></section>}
        {view === 'plan' && <section className="fps-plan-view"><div className="fps-panel fps-plan-intro"><div className="fps-micro">LEARNING PATH / START SMALL</div><h2>Build the next capability,<br /><em>one practical step at a time.</em></h2><p>Suggestions pair your current profile with the skills that appear in adjacent role families. Choose a role to see its gaps and learning ideas.</p><button className="fps-action-primary" onClick={() => setDetail(matches[0])}><GraduationCap size={15} /> VIEW TOP PATH <ArrowRight size={14} /></button></div><LearningCard onOpen={() => setDetail({ ...matches[0], name: 'Your learning path' })} /><div className="fps-plan-roles">{matches.slice(0, 3).map(role => <button key={role.name} onClick={() => setDetail(role)}><span className="fps-micro">{role.family}</span><b>{role.name}</b><small>{role.missing.slice(0, 2).join(' · ') || 'Build depth in your strengths'}</small><ChevronRight size={15} /></button>)}</div></section>}

        <footer className="fps-footer"><span><Activity size={13} /> FUTUREREADY / CAREER INTELLIGENCE</span><span>LOCAL PREVIEW SESSION <i /></span></footer>
      </div>
      <input id="fps-cv-input" type="file" accept=".pdf,.doc,.docx,.txt" hidden onChange={handleFile} />
      {cvMessage && <div className="fps-toast" role="status"><Check size={15} /><span><b>{cvName}</b><small>{cvMessage}</small></span><button aria-label="Dismiss message" onClick={() => setCvMessage('')}><X size={14} /></button></div>}
    </main>
    {detail && <div className="fps-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null); }}>
      <section className="fps-detail" role="dialog" aria-modal="true" aria-labelledby="fps-detail-title">
        <div className="fps-detail-top"><span><Crosshair size={14} /> ROLE INTEL / LOCAL PREVIEW</span><button className="fps-close" aria-label="Close role details" onClick={() => setDetail(null)}><X size={17} /></button></div>
        <div className="fps-micro">{detail.family}</div><h2 id="fps-detail-title">{detail.name}</h2><p className="fps-detail-summary">{detail.summary}</p>
        {roleData.some(role => role.name === detail.name) && <div className="fps-detail-score"><span className="fps-score-ring">{Math.round((detail as Role & { matched?: string[] }).matched!.length / 30 * 100)}%</span><span><b>Dataset skill overlap</b><small>{(detail as Role & { matched?: string[] }).matched!.length} matching skills from your profile. This is not a hiring probability.</small></span></div>}
        <div className="fps-detail-section"><h3><Check size={14} /> SKILLS ALREADY IN YOUR PROFILE</h3><div className="fps-chip-list">{(detail as Role & { matched?: string[] }).matched?.length ? (detail as Role & { matched?: string[] }).matched!.map(name => <span className="fps-chip" key={name}>{name}</span>) : <span className="fps-detail-muted">Start with the skills you already use; this overview stays local.</span>}</div></div>
        <div className="fps-detail-section"><h3><ArrowRight size={14} /> POSSIBLE SKILLS TO BUILD</h3><div className="fps-chip-list">{detail.learning.map(name => <span className="fps-chip is-gap" key={name}>{name}</span>)}</div><p className="fps-detail-muted">Learning ideas are starting points, not prescribed courses.</p></div>
        <button className="fps-action-primary fps-detail-action" onClick={() => { setView('plan'); setDetail(null); }}><BookOpen size={15} /> EXPLORE LEARNING PLAN <ArrowRight size={14} /></button>
        <div className="fps-detail-source"><ShieldCheck size={13} /> DEMO ROLE DATA · ILLUSTRATIVE, NOT LIVE</div>
      </section>
    </div>}
  </div>;
}

function InfoMark() { return <CircleHelp size={14} aria-hidden="true" />; }

function SkillLoadout({ skills, setSkills, adding, setAdding, available, addSkill }: { skills: Skill[]; setSkills: (skills: Skill[]) => void; adding: boolean; setAdding: (value: boolean) => void; available: string[]; addSkill: (name: string) => void }) {
  return <section className="fps-panel fps-skill-panel">
    <div className="fps-section-heading"><div><div className="fps-micro">YOUR PROFILE / EDITABLE</div><h2>Skills loadout</h2></div><button className="fps-add-skill" onClick={() => setAdding(!adding)} aria-expanded={adding} data-testid="button-add-skill"><Plus size={14} /> ADD SKILL</button></div>
    {adding && <div className="fps-add-options" aria-label="Suggested skills to add">{available.length ? available.map(name => <button key={name} onClick={() => addSkill(name)}>{name}<Plus size={12} /></button>) : <span>All suggested skills are already in your loadout.</span>}<button className="fps-option-close" onClick={() => setAdding(false)} aria-label="Close skill options"><X size={14} /></button></div>}
    <div className="fps-skill-list">{skills.map(skill => <div className="fps-skill-row" key={skill.name}><span className="fps-skill-index">{String(skills.indexOf(skill) + 1).padStart(2, '0')}</span><span className="fps-skill-info"><b>{skill.name}</b><small>{skill.category} <i /> {skill.trend} sample signal</small></span><div className="fps-level-pips" aria-label={`${skill.name}: level ${skill.level} of 5`}>{[1, 2, 3, 4, 5].map(level => <i className={level <= skill.level ? 'is-on' : ''} key={level} />)}</div><label className="fps-level-control"><span className="sr-only">Set {skill.name} level</span><select value={skill.level} aria-label={`Set ${skill.name} level`} onChange={event => setSkills(skills.map(item => item.name === skill.name ? { ...item, level: Number(event.target.value) } : item))}>{[1, 2, 3, 4, 5].map(level => <option key={level} value={level}>{level} · {levelLabel(level)}</option>)}</select></label></div>)}</div>
    <div className="fps-cv-note"><span className="fps-cv-note-icon"><FileText size={15} /></span><span><b>CV PICKER · OPTIONAL</b><small>Local-only selection. No parsing or upload; enter skills yourself.</small></span><button onClick={() => document.getElementById('fps-cv-input')?.click()}>CHOOSE FILE</button></div>
  </section>;
}

function LearningCard({ onOpen }: { onOpen: () => void }) {
  const suggestions = [
    { name: 'Service blueprinting', why: 'Connect customer needs to the work behind them', time: '4 WKS', icon: Layers3 },
    { name: 'Data storytelling', why: 'Make evidence easier to act on', time: '3 WKS', icon: BarChart3 },
    { name: 'Facilitation', why: 'A strength you can grow and share', time: 'BUILD', icon: Users },
  ];
  return <section className="fps-panel fps-learning-panel"><div className="fps-section-heading"><div><div className="fps-micro">UPGRADE PATH / FOR YOUR TOP MATCH</div><h2>Skills to build next</h2></div><GraduationCap size={16} /></div>
    <div className="fps-learning-list">{suggestions.map((item, index) => { const Icon = item.icon; return <div className="fps-learning-row" key={item.name}><span className="fps-learning-num">0{index + 1}</span><span className="fps-learning-icon"><Icon size={15} /></span><span className="fps-learning-copy"><b>{item.name}</b><small>{item.why}</small></span><span className="fps-learning-time">{item.time}</span></div>; })}</div>
    <button className="fps-learning-cta" onClick={onOpen}>OPEN LEARNING INTEL <ArrowRight size={14} /></button>
  </section>;
}
