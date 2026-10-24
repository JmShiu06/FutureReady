import { useState, type ReactNode, type ChangeEvent, type AnchorHTMLAttributes } from 'react';
import { Activity, ArrowRight, BarChart3, BriefcaseBusiness, ChevronRight, CircleHelp, Compass, FileText, Info, Plus, ShieldCheck, Sparkles, Target, TrendingUp, Users, X } from 'lucide-react';
import { CareerMatcher } from './_CareerMatcher';
import type { CareerMatch } from './_api';
import './_group.css';
type Skill = { name: string; level: number; trend: string; category: string };
function Link({children, href: _href, ...props}: AnchorHTMLAttributes<HTMLAnchorElement>) { return <a {...props} href="#" onClick={e=>e.preventDefault()}>{children}</a> }
const useLocation = () => ['/'] as const;
const initialSkills: Skill[] = [
  { name: 'Project coordination', level: 4, trend: '+12%', category: 'Operations' },
  { name: 'Customer research', level: 3, trend: '+18%', category: 'People & insight' },
  { name: 'Data storytelling', level: 2, trend: '+24%', category: 'Digital' },
  { name: 'Process improvement', level: 4, trend: '+9%', category: 'Operations' },
];


const skillOptions = ['Service blueprinting', 'Facilitation', 'Workforce planning', 'Learning design', 'Digital fluency', 'Excel', 'AI literacy'];
const levelLabel = (level: number) => ['New to it', 'Exploring', 'Working knowledge', 'Confident', 'Can coach'][level - 1] || 'Working knowledge';


function Shell({ children, page }: { children: ReactNode; page: string }) {
  const [location] = useLocation();
  const nav = [
    { href: '/', label: 'My next step', icon: Compass, key: 'home' },
    { href: '/jobs', label: 'Job Search', icon: BriefcaseBusiness, key: 'jobs' },
    { href: '/team', label: 'Team planning', icon: Users, key: 'team' },
    { href: '/trends', label: 'Skills outlook', icon: BarChart3, key: 'trends' },
  ];
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-brand">
        <span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span>
        <span className="brand-name">FutureReady<span>Career &amp; skills insights</span></span>
      </Link>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {nav.map(item => {
          const Icon = item.icon;
          const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
          return <Link key={item.key} href={item.href} data-testid={`link-nav-${item.key}`} className={`nav-link${active ? ' active' : ''}`}>
            <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
          </Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-note">
          <strong><ShieldCheck size={14} /> DEMO DATA</strong>
          <p>Market signals are illustrative examples, not live labor-market data. Your profile stays on this device.</p>
        </div>
        <div className="profile-chip"><span className="avatar">AL</span><div><strong>Alex Lee</strong><span>Career explorer</span></div></div>
      </div>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <div className="crumb"><span>FutureReady</span><ChevronRight size={12} /><b>{page}</b></div>
        <div className="top-actions"><span><i className="live-dot" />Sample workspace</span><CircleHelp size={16} /></div>
      </header>
      <main className="main-content page-enter">{children}</main>
    </div>
  </div>;
}

function SectionTitle({ title, note, action }: { title: string; note?: string; action?: React.ReactNode }) {
  return <div className="section-head"><div><h2>{title}</h2>{note && <div className="section-kicker">{note}</div>}</div>{action}</div>;
}

function SkillMeter({ level }: { level: number }) {
  return <div className="skill-meter" aria-label={`Level ${level} of 5`}>{[1, 2, 3, 4, 5].map(n => <i className={n <= level ? 'on' : ''} key={n} />)}</div>;
}

function Dashboard({ skills, saveSkills }: { skills: Skill[]; saveSkills: (skills: Skill[]) => void }) {
  const [upload, setUpload] = useState('');
  const [feedback, setFeedback] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [topMatch, setTopMatch] = useState<CareerMatch | null>(null);
  const available = skillOptions.filter(item => !skills.some(skill => skill.name === item));
  const addSkill = (name: string) => {
    saveSkills([...skills, { name, level: 2, trend: '+16%', category: 'Emerging' }]);
    setAddingSkill(false);
  };
  const updateLevel = (name: string, level: number) => saveSkills(skills.map(skill => skill.name === name ? { ...skill, level } : skill));
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUpload(file.name);
    setFeedback(`“${file.name}” is ready for your review. No file was uploaded or analyzed; add skills manually to update your profile.`);
  };
  return <Shell page="My next step">
    <div className="page-head"><div><div className="eyebrow">Your career workspace · Tuesday, 18 June</div><h1>Make your next move<br />with a little more clarity.</h1><p className="page-subtitle">Explore where your skills could take you — and what might help you get there.</p></div>
      <button className="btn btn-secondary" onClick={() => document.getElementById('cv-upload')?.click()} data-testid="button-upload-cv"><FileText size={15} /> Add a CV</button>
    </div>
    <section className="hero-grid">
      <div className="welcome-card">
        <div className="eyebrow">A good place to start</div>
        <h1>Small skill steps can open bigger doors.</h1>
        <p>Your experience already travels. See a few roles that connect to what you know, then explore the skills that could make the move feel closer.</p>
        <div className="welcome-actions"><a href="#recommendations" className="btn btn-primary"><Compass size={14} /> Explore role matches <ArrowRight size={14} /></a><Link className="btn btn-quiet" href="/trends">View skills outlook</Link></div>
      </div>
      <div className="panel stat-card">
        <div className="stat-top"><span>Top dataset skill overlap</span><Target size={16} /></div>
        <div><div className="stat-number" data-testid="stat-top-overlap">{topMatch ? <>{topMatch.score}<span style={{fontSize:17}}>%</span></> : <>—</>}</div><div className="stat-foot">{topMatch ? <span>{topMatch.roleFamily} · {topMatch.matchedSkills.length} of {topMatch.skillsConsidered} skills</span> : <span>Add skills below to calculate</span>}</div></div>
        <div className="section-kicker">Skill overlap, not job probability</div>
      </div>
    </section>
    <section className="dashboard-grid" id="recommendations">
      <div className="panel panel-pad">
        <SectionTitle title="Roles that overlap with your skills" note="CALCULATED FROM A JOB-POSTING DATASET" />
        <CareerMatcher onTopMatch={setTopMatch} />
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Market signals" note="ILLUSTRATIVE, NOT LIVE" action={<Link href="/trends" className="text-link">See outlook <ArrowRight size={12} /></Link>} />
        <div className="signal-list">
          <div className="signal"><span className="signal-mark"><TrendingUp size={15} /></span><span><strong>Data storytelling</strong><small>Appearing across more teams</small></span><span className="signal-trend">+24%</span></div>
          <div className="signal"><span className="signal-mark"><Users size={15} /></span><span><strong>Customer research</strong><small>Human insight stays valuable</small></span><span className="signal-trend">+18%</span></div>
          <div className="signal"><span className="signal-mark"><Sparkles size={15} /></span><span><strong>AI literacy</strong><small>New baseline, not a specialty</small></span><span className="signal-trend">Emerging</span></div>
        </div>
        <div className="source-note" style={{marginTop:17}}><strong>Context matters.</strong> Signals are synthetic examples for exploration, not sourced from a live data feed.</div>
      </div>
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Your skills profile" note="EDIT YOUR STARTING POINT" action={<button className="text-link" onClick={() => setAddingSkill(v => !v)} data-testid="button-add-skill"><Plus size={13} /> Add skill</button>} />
        {addingSkill && <div className="filter-row" style={{marginBottom:12}}>{available.length ? available.map(skill => <button className="btn btn-secondary btn-small" key={skill} onClick={() => addSkill(skill)}>{skill} <Plus size={11} /></button>) : <span className="section-kicker">All suggested skills are in your profile.</span>}<button className="icon-button" aria-label="Close skill options" onClick={() => setAddingSkill(false)}><X size={14}/></button></div>}
        <div className="skill-grid">{skills.map(skill => <div className="skill-item" key={skill.name} data-testid={`skill-item-${skill.name.toLowerCase().replaceAll(' ','-')}`}>
          <div className="skill-top"><strong>{skill.name}</strong><select className="level-select" aria-label={`Set ${skill.name} level`} value={skill.level} onChange={e => updateLevel(skill.name, Number(e.target.value))} data-testid={`select-skill-${skill.name.toLowerCase().replaceAll(' ','-')}`}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} · {levelLabel(n)}</option>)}</select></div>
          <div className="skill-cat">{skill.category} <span style={{color:'#548365',float:'right'}}>{skill.trend} sample signal</span></div><SkillMeter level={skill.level} />
        </div>)}</div>
        <div className="upload-box"><span className="upload-icon"><FileText size={16}/></span><p><strong>{upload || 'Have a CV handy?'}</strong><br/>{feedback || 'Choose a file for a local-only demo check. You will add skills yourself.'}</p><button className="btn btn-quiet btn-small" onClick={() => document.getElementById('cv-upload')?.click()} data-testid="button-choose-file">{upload ? 'Choose another' : 'Choose file'}</button>
          <input id="cv-upload" type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFile} hidden data-testid="input-cv-file" /></div>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="A few skills to build" note="FOR YOUR TOP MATCH" />
        <div className="gap-list">{[
          { name:'Service blueprinting', why:'Connect customer needs to the work behind them', time:'4 weeks' },
          { name:'Data storytelling', why:'Make evidence easier to act on', time:'3 weeks' },
          { name:'Facilitation', why:'Already a strength to grow and share', time:'Build on it' },
        ].map((gap, i) => <div className="gap-row" key={gap.name}><span><strong>{gap.name}</strong><small>{gap.why}</small></span><span className="gap-tag">{i < 2 ? gap.time : 'Strength'}</span></div>)}</div>
        <Link href="/roles/service-designer" className="btn btn-secondary" style={{marginTop:18,width:'100%'}}>See a learning path <ArrowRight size={14}/></Link>
      </div>
    </section>
  </Shell>;
}


export function Current() { const [skills,saveSkills]=useState(initialSkills); return <Dashboard skills={skills} saveSkills={saveSkills}/> }
